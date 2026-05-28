// door.js
// Procedurally builds the Minoan-style exit door in Three.js:
//  - Rounded stone arch frame with ivy vines
//  - Arched wooden door with planks
//  - Forged ironwork: top volute spirals + bottom spirals + handle + keyhole
// The door starts closed/locked and swings open when portaDesbloqueada = true.

function createExitDoor(posX, posY, posZ, rotationY) {
    // All geometry is created in local space then added to a root group.
    const doorGroup = new THREE.Group();
    doorGroup.position.set(posX, posY, posZ);
    doorGroup.rotation.y = rotationY * (Math.PI / 180);

    // ── Colour palette ─────────────────────────────────────────────────────
    const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x8e8070,
        roughness: 0.95,
        metalness: 0.0
    });
    const stoneDarkMat = new THREE.MeshStandardMaterial({
        color: 0x6b5e50,
        roughness: 1.0,
        metalness: 0.0
    });
    const woodMat = new THREE.MeshStandardMaterial({
        color: 0x5c3a1e,
        roughness: 0.88,
        metalness: 0.0
    });
    const woodLightMat = new THREE.MeshStandardMaterial({
        color: 0x7a4e2a,
        roughness: 0.85,
        metalness: 0.0
    });
    const ironMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.6,
        metalness: 0.85,
        envMapIntensity: 0.3
    });
    const brassMat = new THREE.MeshStandardMaterial({
        color: 0xb8860b,
        roughness: 0.35,
        metalness: 0.9,
        envMapIntensity: 0.5
    });
    const ivyMat = new THREE.MeshStandardMaterial({
        color: 0x2d5a1b,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
    const ivyLightMat = new THREE.MeshStandardMaterial({
        color: 0x4a8a2c,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    // ── Dimensions ────────────────────────────────────────────────────────
    const DOOR_W   = 1.4;  // width of door leaf
    const DOOR_H   = 2.6;  // height of rectangular portion
    const ARCH_R   = DOOR_W / 2 + 0.05; // arch inner radius
    const FRAME_T  = 0.28; // stone frame thickness
    const DOOR_D   = 0.08; // door depth
    const FRAME_D  = 0.32; // frame depth

    // ── 1. Stone arch frame ────────────────────────────────────────────────
    const archGroup = new THREE.Group();

    // Left jamb
    const jambGeo = new THREE.BoxGeometry(FRAME_T, DOOR_H, FRAME_D);
    const jambL   = new THREE.Mesh(jambGeo, stoneMat);
    jambL.position.set(-(DOOR_W / 2 + FRAME_T / 2), DOOR_H / 2, 0);
    archGroup.add(jambL);

    // Right jamb
    const jambR = new THREE.Mesh(jambGeo, stoneMat);
    jambR.position.set(DOOR_W / 2 + FRAME_T / 2, DOOR_H / 2, 0);
    archGroup.add(jambR);

    // Arch (semicircle of stone blocks)
    const ARCH_SEGMENTS = 16;
    const outerR = ARCH_R + FRAME_T;
    for (let i = 0; i <= ARCH_SEGMENTS; i++) {
        const angle = (Math.PI / ARCH_SEGMENTS) * i;
        const cx = Math.cos(Math.PI - angle) * (ARCH_R + FRAME_T / 2);
        const cy = DOOR_H + Math.sin(Math.PI - angle) * (ARCH_R + FRAME_T / 2);

        const blockW = (2 * Math.PI * outerR / (ARCH_SEGMENTS * 2)) * 1.12;
        const blockH = FRAME_T * 1.08;
        const blockGeo = new THREE.BoxGeometry(blockW, blockH, FRAME_D);
        const block = new THREE.Mesh(blockGeo, i % 2 === 0 ? stoneMat : stoneDarkMat);
        block.position.set(cx, cy, 0);
        block.rotation.z = -(Math.PI - angle);
        archGroup.add(block);
    }

    // Keystone at the very top
    const keystoneGeo = new THREE.BoxGeometry(FRAME_T * 1.2, FRAME_T * 1.5, FRAME_D * 1.1);
    const keystone = new THREE.Mesh(keystoneGeo, stoneDarkMat);
    keystone.position.set(0, DOOR_H + ARCH_R + FRAME_T / 2, 0);
    archGroup.add(keystone);

    doorGroup.add(archGroup);

    // ── 2. Wooden door leaf ─────────────────────────────────────────────────
    // The door pivots around its left edge → position the pivot group at x = -DOOR_W/2
    const doorLeaf = new THREE.Group();
    doorLeaf.position.set(-DOOR_W / 2, 0, 0); // pivot at left edge

    // Door is a shape (rectangle + semi-circle at top)
    const doorShape = new THREE.Shape();
    doorShape.moveTo(0, 0);
    doorShape.lineTo(DOOR_W, 0);
    doorShape.lineTo(DOOR_W, DOOR_H);
    doorShape.absarc(DOOR_W / 2, DOOR_H, DOOR_W / 2, 0, Math.PI, false);
    doorShape.lineTo(0, 0);

    const extrudeSettings = { depth: DOOR_D, bevelEnabled: false };
    const doorGeo = new THREE.ExtrudeGeometry(doorShape, extrudeSettings);
    const doorMesh = new THREE.Mesh(doorGeo, woodMat);
    doorMesh.position.set(0, 0, -DOOR_D / 2);
    doorLeaf.add(doorMesh);

    // Horizontal planks
    const PLANK_COUNT = 8;
    for (let i = 0; i < PLANK_COUNT; i++) {
        const plankY = (i + 0.5) * (DOOR_H / PLANK_COUNT);
        if (plankY > DOOR_H + 0.1) continue;
        const plankGeo = new THREE.BoxGeometry(DOOR_W - 0.04, 0.02, DOOR_D + 0.005);
        const plank = new THREE.Mesh(plankGeo, i % 2 === 0 ? woodMat : woodLightMat);
        plank.position.set(DOOR_W / 2, plankY, 0);
        doorLeaf.add(plank);
    }

    // Two vertical battens
    for (const bx of [DOOR_W * 0.25, DOOR_W * 0.75]) {
        const battenGeo = new THREE.BoxGeometry(0.06, DOOR_H * 0.88, DOOR_D + 0.01);
        const batten = new THREE.Mesh(battenGeo, woodLightMat);
        batten.position.set(bx, DOOR_H * 0.44, 0);
        doorLeaf.add(batten);
    }

    // ── 3. Forged iron hardware ─────────────────────────────────────────────

    // Helper: build a single flat spiral (volute) using a tube along a curve
    function createVolute(cx, cy, cz, radiusStart, radiusEnd, turns, segments, tubeR, mat) {
        const points = [];
        const totalAngle = turns * Math.PI * 2;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * totalAngle;
            const r = radiusStart + (radiusEnd - radiusStart) * t;
            points.push(new THREE.Vector3(
                cx + Math.cos(angle) * r,
                cy + Math.sin(angle) * r,
                cz
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, segments, tubeR, 6, false);
        return new THREE.Mesh(tubeGeo, mat);
    }

    // Helper: horizontal bar connecting two volutas
    function createBar(x1, y, z, x2, tubeR, mat) {
        const points = [new THREE.Vector3(x1, y, z), new THREE.Vector3(x2, y, z)];
        const curve = new THREE.CatmullRomCurve3(points);
        const geo = new THREE.TubeGeometry(curve, 2, tubeR, 6, false);
        return new THREE.Mesh(geo, mat);
    }

    // ── Top ironwork: two large opposing volutas near top of door ─────────
    const topY    = DOOR_H * 0.82;
    const voluteR = 0.22;
    const barY    = topY;

    // Left top volute (spirals left)
    const vL1 = createVolute(
        DOOR_W * 0.26, topY, 0,
        voluteR, 0.015, 1.5, 48, 0.022, ironMat
    );
    doorLeaf.add(vL1);

    // Right top volute (mirrors right)
    const vR1 = createVolute(
        DOOR_W * 0.74, topY, 0,
        voluteR, 0.015, -1.5, 48, 0.022, ironMat
    );
    doorLeaf.add(vR1);

    // Top horizontal connecting bar
    const barTop = createBar(DOOR_W * 0.26, barY, 0, DOOR_W * 0.74, 0.022, ironMat);
    doorLeaf.add(barTop);

    // ── Bottom ironwork: two smaller opposing volutas near bottom ─────────
    const botY    = DOOR_H * 0.20;
    const voluteRb = 0.17;

    const vL2 = createVolute(
        DOOR_W * 0.26, botY, 0,
        voluteRb, 0.012, 1.4, 40, 0.018, ironMat
    );
    doorLeaf.add(vL2);

    const vR2 = createVolute(
        DOOR_W * 0.74, botY, 0,
        voluteRb, 0.012, -1.4, 40, 0.018, ironMat
    );
    doorLeaf.add(vR2);

    const barBot = createBar(DOOR_W * 0.26, botY, 0, DOOR_W * 0.74, 0.018, ironMat);
    doorLeaf.add(barBot);

    // ── Vertical spine connecting top and bottom bars ─────────────────────
    const spineGeo = new THREE.CylinderGeometry(0.018, 0.018, DOOR_H * 0.62, 8);
    const spine = new THREE.Mesh(spineGeo, ironMat);
    spine.position.set(DOOR_W / 2, DOOR_H * 0.51, 0);
    doorLeaf.add(spine);

    // ── Handle (brass ring) ───────────────────────────────────────────────
    const handleY  = DOOR_H * 0.50;
    const handleX  = DOOR_W * 0.78;
    const handleZ  = DOOR_D + 0.015;

    // Back plate
    const plateCyl = new THREE.CylinderGeometry(0.065, 0.065, 0.018, 16);
    const plate = new THREE.Mesh(plateCyl, brassMat);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(handleX, handleY, handleZ);
    doorLeaf.add(plate);

    // Ring handle
    const ringHandle = new THREE.TorusGeometry(0.055, 0.016, 8, 20, Math.PI);
    const handleMesh = new THREE.Mesh(ringHandle, brassMat);
    handleMesh.position.set(handleX, handleY + 0.055, handleZ + 0.012);
    doorLeaf.add(handleMesh);

    // ── Keyhole ────────────────────────────────────────────────────────────
    const keyholeY = DOOR_H * 0.44;
    const keyholeX = handleX;

    // Outer escutcheon
    const escutGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.014, 16);
    const escutcheon = new THREE.Mesh(escutGeo, brassMat);
    escutcheon.rotation.x = Math.PI / 2;
    escutcheon.position.set(keyholeX, keyholeY, handleZ);
    doorLeaf.add(escutcheon);

    // Slot (dark cutout illusion with a flat dark disk)
    const slotGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.016, 6);
    const slotMesh = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 }));
    slotMesh.rotation.x = Math.PI / 2;
    slotMesh.position.set(keyholeX, keyholeY, handleZ + 0.001);
    doorLeaf.add(slotMesh);

    // ── Hinges (two brass rectangles on left side) ────────────────────────
    for (const hy of [DOOR_H * 0.18, DOOR_H * 0.78]) {
        const hingeGeo = new THREE.BoxGeometry(0.065, 0.15, DOOR_D + 0.02);
        const hinge = new THREE.Mesh(hingeGeo, brassMat);
        hinge.position.set(0.032, hy, 0);
        doorLeaf.add(hinge);
    }

    doorGroup.add(doorLeaf);

    // ── 4. Ivy / vegetation on stone arch ──────────────────────────────────
    function addLeaf(px, py, pz, scale, mat) {
        const leafGeo = new THREE.SphereGeometry(0.13 * scale, 5, 4);
        const leaf = new THREE.Mesh(leafGeo, mat);
        leaf.scale.set(1, 0.55, 0.7);
        leaf.position.set(px, py, pz);
        archGroup.add(leaf);
    }

    function addStem(x1, y1, x2, y2, z, mat) {
        const pts = [new THREE.Vector3(x1, y1, z), new THREE.Vector3(x2, y2, z)];
        const c = new THREE.CatmullRomCurve3(pts);
        const g = new THREE.TubeGeometry(c, 4, 0.018, 5, false);
        archGroup.add(new THREE.Mesh(g, mat));
    }

    // Left side ivy
    const ivyPositionsL = [
        [-DOOR_W / 2 - FRAME_T * 0.9, 0.4, -FRAME_D * 0.3],
        [-DOOR_W / 2 - FRAME_T * 0.8, 0.9, -FRAME_D * 0.4],
        [-DOOR_W / 2 - FRAME_T * 1.1, 1.5, FRAME_D * 0.2],
        [-DOOR_W / 2 - FRAME_T * 0.7, 2.1, -FRAME_D * 0.35],
        [-DOOR_W / 2 - FRAME_T * 0.9, 2.6, 0],
        [-DOOR_W / 2 - FRAME_T * 0.5, 3.1, FRAME_D * 0.15],
        [-DOOR_W / 2 - FRAME_T * 0.3, 3.5, -FRAME_D * 0.2],
        [-0.1, DOOR_H + ARCH_R * 0.9, FRAME_D * 0.1],
    ];
    ivyPositionsL.forEach(([x, y, z]) => {
        addLeaf(x, y, z, 1 + Math.random() * 0.4, Math.random() > 0.4 ? ivyMat : ivyLightMat);
    });

    // Right side ivy
    const ivyPositionsR = [
        [DOOR_W / 2 + FRAME_T * 0.9, 0.5, FRAME_D * 0.3],
        [DOOR_W / 2 + FRAME_T * 0.8, 1.1, -FRAME_D * 0.2],
        [DOOR_W / 2 + FRAME_T * 1.0, 1.7, FRAME_D * 0.35],
        [DOOR_W / 2 + FRAME_T * 0.7, 2.3, 0],
        [DOOR_W / 2 + FRAME_T * 0.9, 2.8, -FRAME_D * 0.1],
        [DOOR_W / 2 + FRAME_T * 0.5, 3.2, FRAME_D * 0.25],
        [0.1, DOOR_H + ARCH_R * 0.85, -FRAME_D * 0.1],
    ];
    ivyPositionsR.forEach(([x, y, z]) => {
        addLeaf(x, y, z, 1 + Math.random() * 0.4, Math.random() > 0.4 ? ivyMat : ivyLightMat);
    });

    // Stems connecting clusters
    addStem(-DOOR_W / 2 - FRAME_T * 0.9, 0.4, -DOOR_W / 2 - FRAME_T * 0.8, 0.9, -FRAME_D * 0.35, ivyMat);
    addStem(-DOOR_W / 2 - FRAME_T * 0.8, 0.9, -DOOR_W / 2 - FRAME_T * 1.1, 1.5, 0, ivyMat);
    addStem( DOOR_W / 2 + FRAME_T * 0.9, 0.5,  DOOR_W / 2 + FRAME_T * 0.8, 1.1, 0, ivyMat);
    addStem( DOOR_W / 2 + FRAME_T * 0.8, 1.1,  DOOR_W / 2 + FRAME_T * 1.0, 1.7, 0, ivyMat);

    // ── 5. "Locked" indicator light (red glow when locked) ────────────────
    const lockLight = new THREE.PointLight(0xff2200, 0.8, 1.5);
    lockLight.position.set(handleX - DOOR_W / 2, handleY, handleZ + 0.2);
    doorLeaf.add(lockLight);
    doorGroup.userData.lockLight = lockLight;

    // ── 6. Shadow config ───────────────────────────────────────────────────
    doorGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // ── 7. Store leaf ref for unlock animation ─────────────────────────────
    doorGroup.userData.leaf = doorLeaf;

    scene.add(doorGroup);

    // Expose to objects.js unlock logic
    portaSaida = doorLeaf;

    return doorGroup;
}
