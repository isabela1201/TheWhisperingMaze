// player.js
// Handles player body construction, first-person torch, animations, camera mode toggling, and movement logic

let walkTimer = 0; // Local walk timer for animations

function createPlayerBody() {
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xdca889, // Greek Mediterranean bronze skin tone
        roughness: 0.8,
        metalness: 0.05,
        flatShading: true
    });

    const togaMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5fa, // White toga
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true
    });

    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x1a1513, // Dark hair
        roughness: 0.85,
        metalness: 0.0,
        flatShading: true
    });

    const leatherMat = new THREE.MeshStandardMaterial({
        color: 0x4a3225, // Leather sandals/belt
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true
    });

    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Gold details
        roughness: 0.3,
        metalness: 0.8,
        flatShading: true
    });

    playerBody = new THREE.Group();

    // --- JOINTS ---
    
    // Hip Joints (Pivot at top of thigh: y = 0.675)
    const leftLegJoint = new THREE.Group();
    leftLegJoint.position.set(-0.14, 0.675, 0);
    playerBody.add(leftLegJoint);
    playerBody.leftLegJoint = leftLegJoint;

    const rightLegJoint = new THREE.Group();
    rightLegJoint.position.set(0.14, 0.675, 0);
    playerBody.add(rightLegJoint);
    playerBody.rightLegJoint = rightLegJoint;

    // Shoulder Joints
    const leftArmJoint = new THREE.Group();
    leftArmJoint.position.set(-0.24, 1.48, 0);
    leftArmJoint.rotation.set(0.15, 0, 0.25); // Rest position
    playerBody.add(leftArmJoint);
    playerBody.leftArmJoint = leftArmJoint;

    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), skinMat);
    leftShoulder.castShadow = true;
    leftArmJoint.add(leftShoulder);

    const rightArmJoint = new THREE.Group();
    rightArmJoint.position.set(0.24, 1.48, 0);
    rightArmJoint.rotation.set(0.15, 0, -0.25); // Rest position
    playerBody.add(rightArmJoint);
    playerBody.rightArmJoint = rightArmJoint;

    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), skinMat);
    rightShoulder.castShadow = true;
    rightArmJoint.add(rightShoulder);

    // Elbow Joints
    const leftElbowJoint = new THREE.Group();
    leftElbowJoint.position.set(0, -0.3, 0.02);
    leftElbowJoint.rotation.set(0.1, 0, 0);
    leftArmJoint.add(leftElbowJoint);
    playerBody.leftElbowJoint = leftElbowJoint;

    const rightElbowJoint = new THREE.Group();
    rightElbowJoint.position.set(0, -0.35, 0.02);
    rightElbowJoint.rotation.set(0.1, 0, 0);
    rightArmJoint.add(rightElbowJoint);
    playerBody.rightElbowJoint = rightElbowJoint;

    // --- ASSOCIATED MESHES ---

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.65, 5);
    
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(0, -0.325, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLegJoint.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0, -0.325, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLegJoint.add(rightLeg);

    // Sandals
    const footGeo = new THREE.BoxGeometry(0.09, 0.07, 0.18);
    
    const leftFoot = new THREE.Mesh(footGeo, leatherMat);
    leftFoot.position.set(0, -0.64, 0.04);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    leftLegJoint.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, leatherMat);
    rightFoot.position.set(0, -0.64, 0.04);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    rightLegJoint.add(rightFoot);

    // Arms
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.3, 5), skinMat);
    leftUpperArm.position.set(0, -0.15, 0);
    leftUpperArm.castShadow = true;
    leftArmJoint.add(leftUpperArm);

    const leftArmband = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.04, 6), goldMat);
    leftArmband.position.set(0, -0.05, 0);
    leftArmband.castShadow = true;
    leftUpperArm.add(leftArmband);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 5), skinMat);
    leftForearm.position.set(0, -0.16, 0.02);
    leftForearm.castShadow = true;
    leftElbowJoint.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), skinMat);
    leftHand.position.set(0, -0.32, 0.04);
    leftHand.castShadow = true;
    leftElbowJoint.add(leftHand);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 5), skinMat);
    rightUpperArm.position.set(0, -0.175, 0);
    rightUpperArm.castShadow = true;
    rightArmJoint.add(rightUpperArm);

    const rightArmband = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.04, 6), goldMat);
    rightArmband.position.set(0, -0.05, 0);
    rightArmband.castShadow = true;
    rightUpperArm.add(rightArmband);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 5), skinMat);
    rightForearm.position.set(0, -0.16, 0.02);
    rightForearm.castShadow = true;
    rightElbowJoint.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), skinMat);
    rightHand.position.set(0, -0.32, 0.04);
    rightHand.castShadow = true;
    rightElbowJoint.add(rightHand);
    playerBody.rightHand = rightHand;

    // Low-poly torch mesh in right hand
    const torchMesh = new THREE.Group();
    
    const torchHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.015, 0.25, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a2e15, roughness: 0.9, flatShading: true })
    );
    torchHandle.position.y = 0.125;
    torchHandle.castShadow = true;
    torchMesh.add(torchHandle);

    const torchFlame = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.05, 0),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff5500, emissiveIntensity: 1, flatShading: true })
    );
    torchFlame.position.y = 0.27;
    torchMesh.add(torchFlame);

    torchMesh.position.copy(rightHand.position);
    torchMesh.rotation.x = Math.PI / 2.5; // Angled forward
    rightElbowJoint.add(torchMesh);
    playerBody.torchMesh = torchMesh;
    playerBody.torchMesh.flame = torchFlame;

    // --- CENTRAL BODY ELEMENTS ---

    // Toga Skirt
    const skirtGeo = new THREE.CylinderGeometry(0.21, 0.25, 0.65, 6);
    const skirt = new THREE.Mesh(skirtGeo, togaMat);
    skirt.position.set(0, 0.9, 0);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    playerBody.add(skirt);

    // Toga folds
    const foldGeo = new THREE.BoxGeometry(0.05, 0.62, 0.04);
    
    const skirtFoldL = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldL.position.set(-0.1, 0.9, -0.19);
    skirtFoldL.rotation.set(0.05, 0.1, 0.05);
    skirtFoldL.castShadow = true;
    playerBody.add(skirtFoldL);

    const skirtFoldR = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldR.position.set(0.1, 0.9, -0.19);
    skirtFoldR.rotation.set(0.05, -0.1, -0.05);
    skirtFoldR.castShadow = true;
    playerBody.add(skirtFoldR);

    const skirtFoldC = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldC.position.set(0, 0.9, -0.21);
    skirtFoldC.rotation.set(0.05, 0, 0);
    skirtFoldC.castShadow = true;
    playerBody.add(skirtFoldC);

    // Torso (Skin)
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.45, 6);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.set(0, 1.35, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    playerBody.add(torso);
    playerBody.torso = torso;

    // Toga Strap
    const shoulderToga = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.24), togaMat);
    shoulderToga.position.set(-0.15, 1.40, 0);
    shoulderToga.rotation.set(0, 0, 0.15);
    shoulderToga.castShadow = true;
    playerBody.add(shoulderToga);

    // Diagonal folds (Front and Back)
    const backFold1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.05), togaMat);
    backFold1.position.set(-0.06, 1.32, -0.07);
    backFold1.rotation.set(0.1, 0.0, -0.45);
    backFold1.castShadow = true;
    playerBody.add(backFold1);

    const backFold2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), togaMat);
    backFold2.position.set(-0.01, 1.28, -0.08);
    backFold2.rotation.set(0.15, 0.1, -0.42);
    backFold2.castShadow = true;
    playerBody.add(backFold2);

    const frontFold1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.05), togaMat);
    frontFold1.position.set(-0.06, 1.32, 0.07);
    frontFold1.rotation.set(-0.1, 0.0, 0.45);
    frontFold1.castShadow = true;
    playerBody.add(frontFold1);

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 6), leatherMat);
    belt.position.set(0, 1.15, 0);
    belt.castShadow = true;
    playerBody.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), goldMat);
    buckle.position.set(0, 1.15, 0.20);
    buckle.castShadow = true;
    playerBody.add(buckle);

    // Gold Fibula (toga shoulder button)
    const fibula = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 6), goldMat);
    fibula.position.set(-0.15, 1.45, 0.12);
    fibula.rotation.x = Math.PI / 2;
    fibula.castShadow = true;
    playerBody.add(fibula);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 5), skinMat);
    neck.position.set(0, 1.58, 0);
    neck.castShadow = true;
    neck.receiveShadow = true;
    playerBody.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), skinMat);
    head.position.set(0, 1.69, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    playerBody.add(head);

    // Hair
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), hairMat);
    hairTop.position.set(0, 1.77, -0.02);
    hairTop.scale.set(1.15, 0.85, 1.15);
    hairTop.castShadow = true;
    playerBody.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.09), hairMat);
    hairBack.position.set(0, 1.71, -0.1);
    hairBack.rotation.set(-0.1, 0, 0);
    hairBack.castShadow = true;
    playerBody.add(hairBack);

    const sideburnL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.07), hairMat);
    sideburnL.position.set(-0.11, 1.68, -0.02);
    sideburnL.castShadow = true;
    playerBody.add(sideburnL);

    const sideburnR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.07), hairMat);
    sideburnR.position.set(0.11, 1.68, -0.02);
    sideburnR.castShadow = true;
    playerBody.add(sideburnR);

    // Beard
    const beardJaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.11), hairMat);
    beardJaw.position.set(0, 1.61, 0.04);
    beardJaw.rotation.set(0.1, 0, 0);
    beardJaw.castShadow = true;
    playerBody.add(beardJaw);

    playerBody.visible = false;
    scene.add(playerBody);
}

function createFirstPersonTorch() {
    fpTorch = new THREE.Group();
    
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.22, 5), handleMat);
    handle.position.y = 0.11;
    fpTorch.add(handle);
    
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8, flatShading: true });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.05, 5), cupMat);
    cup.position.y = 0.20;
    fpTorch.add(cup);
    
    const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff5500,
        emissiveIntensity: 2.0,
        flatShading: true
    });
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), flameMat);
    flame.position.y = 0.25;
    fpTorch.add(flame);
    fpTorch.flame = flame;
    
    // Position at lower right of screen
    fpTorch.position.set(0.25, -0.22, -0.4);
    fpTorch.rotation.set(0.15, -0.3, 0.05);
    
    camera.add(fpTorch);
    fpTorch.visible = false; // Starts hidden
}

function toggleCamera() {
    cameraMode = (cameraMode === 'FPS') ? 'TPS' : 'FPS';

    if (cameraMode === 'TPS') {
        camera.fov = 65;
        if (playerBody) playerBody.visible = true;
    } else {
        camera.fov = 75;
        if (playerBody) playerBody.visible = false;
        camera.rotation.order = 'YXZ';
    }
    camera.updateProjectionMatrix();
}

function updateMovement() {
    if (!gameStarted || gameWon || paused) return;

    const speed = KEY.shift ? CONFIG.PLAYER_SPRINT : CONFIG.PLAYER_SPEED;
    const moveDir = new THREE.Vector3();

    if (KEY.w) moveDir.z -= 1;
    if (KEY.s) moveDir.z += 1;
    if (KEY.a) moveDir.x -= 1;
    if (KEY.d) moveDir.x += 1;

    // Flight Mode logic
    if (flyMode) {
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right   = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        
        const finalDirection = new THREE.Vector3()
            .addScaledVector(forward, -moveDir.z)
            .addScaledVector(right, moveDir.x);
            
        if (finalDirection.lengthSq() > 0) {
            finalDirection.normalize().multiplyScalar(speed);
        }

        if (KEY.space) playerPos.y += speed;     // Go up
        if (KEY.control) playerPos.y -= speed;   // Go down

        playerPos.x += finalDirection.x;
        playerPos.z += finalDirection.z;
        return; 
    }

    if (moveDir.lengthSq() === 0) {
        if (playerPos.y !== CONFIG.PLAYER_HEIGHT) {
            playerPos.y = THREE.MathUtils.lerp(playerPos.y, CONFIG.PLAYER_HEIGHT, 0.1);
        }
        return;
    }

    moveDir.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    const finalDirection = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z)
        .addScaledVector(right, moveDir.x)
        .normalize()
        .multiplyScalar(speed);

    // Head bobbing
    bobTimer += KEY.shift ? 0.22 : 0.14;
    playerPos.y = CONFIG.PLAYER_HEIGHT + Math.sin(bobTimer) * 0.04;

    // Collision detection using raycasting
    const origin = new THREE.Vector3(playerPos.x, 0.5, playerPos.z);

    const rayX = new THREE.Raycaster(origin, new THREE.Vector3(Math.sign(finalDirection.x), 0, 0), 0, CONFIG.COLLISION_MARGIN);
    if (rayX.intersectObjects(mazeObjects, false).length === 0) playerPos.x += finalDirection.x;

    const rayZ = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, Math.sign(finalDirection.z)), 0, CONFIG.COLLISION_MARGIN);
    if (rayZ.intersectObjects(mazeObjects, false).length === 0) playerPos.z += finalDirection.z;
}

function updatePlayerAnimation(delta) {
    if (!playerBody || !playerBody.visible) return;

    if (playerBody.torchMesh) {
        playerBody.torchMesh.visible = (typeof hasTorch !== 'undefined') ? hasTorch : false;
        if (playerBody.torchMesh.flame) {
            playerBody.torchMesh.flame.visible = (typeof torchOn !== 'undefined') ? torchOn : false;
        }
    }

    const isFlying = typeof flyMode !== 'undefined' && flyMode;
    const isMoving = typeof KEY !== 'undefined' && (KEY.w || KEY.s || KEY.a || KEY.d);
    const isSprinting = typeof KEY !== 'undefined' && KEY.shift;

    const swingSpeed = isSprinting ? 12 : 8.5;
    const maxLegSwing = isSprinting ? 0.65 : 0.42;
    const maxArmSwing = isSprinting ? 0.55 : 0.35;

    if (isFlying) {
        // Floating animation
        const floatTime = clock.getElapsedTime() * 2.0;
        
        const targetLegRot = 0.15 + Math.sin(floatTime) * 0.05;
        playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftLegJoint.rotation.x, targetLegRot, 0.1);
        playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightLegJoint.rotation.x, targetLegRot - 0.05, 0.1);

        const targetArmRotX = 0.2 + Math.cos(floatTime) * 0.08;
        const targetArmRotZLeft = 0.3 + Math.sin(floatTime) * 0.05;
        const targetArmRotZRight = -0.3 - Math.sin(floatTime) * 0.05;

        playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.x, targetArmRotX, 0.1);
        playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.x, targetArmRotX, 0.1);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, targetArmRotZLeft, 0.1);
        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, targetArmRotZRight, 0.1);

        playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftElbowJoint.rotation.x, 0.25, 0.1);
        playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightElbowJoint.rotation.x, 0.25, 0.1);

        playerBody.torso.rotation.y = THREE.MathUtils.lerp(playerBody.torso.rotation.y, 0, 0.1);
    } else if (isMoving) {
        walkTimer += delta * swingSpeed;
        
        playerBody.leftLegJoint.rotation.x = Math.sin(walkTimer) * maxLegSwing;
        playerBody.rightLegJoint.rotation.x = -Math.sin(walkTimer) * maxLegSwing;

        playerBody.rightArmJoint.rotation.x = 0.15 + Math.sin(walkTimer) * maxArmSwing;
        playerBody.leftArmJoint.rotation.x = 0.15 - Math.sin(walkTimer) * maxArmSwing;

        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, -0.25, 0.1);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, 0.25, 0.1);

        playerBody.rightElbowJoint.rotation.x = 0.1 + (Math.sin(walkTimer + Math.PI/2) * 0.15 + 0.15);
        playerBody.leftElbowJoint.rotation.x = 0.1 + (Math.sin(-walkTimer + Math.PI/2) * 0.15 + 0.15);

        playerBody.torso.rotation.y = Math.sin(walkTimer) * 0.06;
    } else {
        const lerpFactor = 0.18;
        playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftLegJoint.rotation.x, 0, lerpFactor);
        playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightLegJoint.rotation.x, 0, lerpFactor);
        
        playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.x, 0.15, lerpFactor);
        playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.x, 0.15, lerpFactor);

        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, -0.25, lerpFactor);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, 0.25, lerpFactor);

        playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightElbowJoint.rotation.x, 0.1, lerpFactor);
        playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftElbowJoint.rotation.x, 0.1, lerpFactor);

        playerBody.torso.rotation.y = THREE.MathUtils.lerp(playerBody.torso.rotation.y, 0, lerpFactor);
    }
}
