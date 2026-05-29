// player.js
// Handles player body construction, first-person torch, animations, camera mode toggling, and movement logic

import * as THREE from 'three';
import * as state from './state.js';
import { S } from './state.js';
import { CONFIG } from './config.js';

let walkTimer = 0; // Local walk timer for animations

export function createPlayerBody() {
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

    const playerBody = new THREE.Group();

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

    // Low-poly torch mesh in right hand (styled to match the new design)
    const torchMesh = new THREE.Group();
    
    const torchHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.012, 0.28, 5),
        new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8, metalness: 0.1, flatShading: true })
    );
    torchHandle.position.y = 0.0;
    torchHandle.castShadow = true;
    torchMesh.add(torchHandle);

    const torchCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.02, 0.06, 5),
        new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.4, metalness: 0.8, flatShading: true })
    );
    torchCup.position.y = 0.16;
    torchCup.castShadow = true;
    torchMesh.add(torchCup);

    const torchTopRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.015, 5, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.4, metalness: 0.8, flatShading: true })
    );
    torchTopRing.position.y = 0.24;
    torchMesh.add(torchTopRing);

    // Minor decorative ribs
    for (let i = 0; i < 5; i++) {
        const rib = new THREE.Mesh(
            new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4),
            new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.4, metalness: 0.8, flatShading: true })
        );
        const angle = (i * Math.PI * 2) / 5;
        rib.position.set(Math.cos(angle) * 0.038, 0.20, Math.sin(angle) * 0.038);
        torchMesh.add(rib);
    }

    const torchFlame = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.045, 0),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff5500, emissiveIntensity: 2.0, flatShading: true })
    );
    torchFlame.position.y = 0.25;
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
    state.scene.add(playerBody);
    S.setPlayerBody(playerBody);
}

export function createFirstPersonTorch() {
    const fpTorch = new THREE.Group();
    
    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
        color: 0xcd7f32, // Bronze
        roughness: 0.4,
        metalness: 0.8,
        flatShading: true
    });
    
    const handleMat = new THREE.MeshStandardMaterial({
        color: 0x5c4033, // Dark Wood
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });

    const pitchMat = new THREE.MeshStandardMaterial({
        color: 0x111111, // Glossy pitch/coal
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
    });

    const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff4400,
        emissiveIntensity: 3.0,
        flatShading: true,
        transparent: true,
        opacity: 0.95
    });

    // 1. Handle (centered at y=0, extends from y=-0.175 to y=0.175)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.35, 6), handleMat);
    handle.position.set(0, 0, 0);
    fpTorch.add(handle);

    // 2. Cup
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.08, 6), metalMat);
    cup.position.set(0, 0.21, 0);
    fpTorch.add(cup);

    // 3. Top Ring
    const topRing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 6, 1, true), metalMat);
    topRing.position.set(0, 0.32, 0);
    fpTorch.add(topRing);

    // 4. Vertical Ribs
    for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4), metalMat);
        const angle = (i * Math.PI) / 3;
        const radiusTop = 0.055;
        const radiusBottom = 0.045;
        rib.position.set(
            Math.cos(angle) * (radiusTop + radiusBottom) / 2,
            0.27,
            Math.sin(angle) * (radiusTop + radiusBottom) / 2
        );
        rib.rotation.z = -Math.sin(angle) * 0.12;
        rib.rotation.x = Math.cos(angle) * 0.12;
        fpTorch.add(rib);
    }

    // 5. Molten Pitch Core
    const pitch = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035), pitchMat);
    pitch.position.set(0, 0.24, 0);
    fpTorch.add(pitch);

    // 6. Dynamic Flame Mesh
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), flameMat);
    flame.position.set(0, 0.33, 0);
    fpTorch.add(flame);
    fpTorch.flame = flame;
    
    // Position at lower right of screen (lowered and pushed forward slightly to look cinematic and fit the camera fov)
    fpTorch.position.set(0.25, -0.28, -0.45);
    fpTorch.rotation.set(0.15, -0.3, 0.05);
    
    state.camera.add(fpTorch);
    fpTorch.visible = false; // Starts hidden
    S.setFpTorch(fpTorch);
}

export function toggleCamera() {
    S.setCameraMode(state.cameraMode === 'FPS' ? 'TPS' : 'FPS');

    if (state.cameraMode === 'TPS') {
        state.camera.fov = 65;
        if (state.playerBody) state.playerBody.visible = true;
    } else {
        state.camera.fov = 75;
        if (state.playerBody) state.playerBody.visible = false;
        state.camera.rotation.order = 'YXZ';
    }
    state.camera.updateProjectionMatrix();
}

export function updateMovement() {
    if (!state.gameStarted || state.gameWon || state.paused) return;

    const speed = state.KEY.shift ? CONFIG.PLAYER_SPRINT : CONFIG.PLAYER_SPEED;
    const moveDir = new THREE.Vector3();

    if (state.KEY.w) moveDir.z -= 1;
    if (state.KEY.s) moveDir.z += 1;
    if (state.KEY.a) moveDir.x -= 1;
    if (state.KEY.d) moveDir.x += 1;

    // Flight Mode logic
    if (state.flyMode) {
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
        const right   = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
        
        const finalDirection = new THREE.Vector3()
            .addScaledVector(forward, -moveDir.z)
            .addScaledVector(right, moveDir.x);
            
        if (finalDirection.lengthSq() > 0) {
            finalDirection.normalize().multiplyScalar(speed);
        }

        if (state.KEY.space) state.playerPos.y += speed;     // Go up
        if (state.KEY.control) state.playerPos.y -= speed;   // Go down

        state.playerPos.x += finalDirection.x;
        state.playerPos.z += finalDirection.z;
        return; 
    }

    if (moveDir.lengthSq() === 0) {
        if (state.playerPos.y !== CONFIG.PLAYER_HEIGHT) {
            state.playerPos.y = THREE.MathUtils.lerp(state.playerPos.y, CONFIG.PLAYER_HEIGHT, 0.1);
        }
        return;
    }

    moveDir.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

    const finalDirection = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z)
        .addScaledVector(right, moveDir.x)
        .normalize()
        .multiplyScalar(speed);

    // Head bobbing
    S.setBobTimer(state.bobTimer + (state.KEY.shift ? 0.22 : 0.14));
    state.playerPos.y = CONFIG.PLAYER_HEIGHT + Math.sin(state.bobTimer) * 0.04;

    // Fast 2D sphere-sphere collision detection against instanced trees, rocks and bushes
    let collidesX = false;
    let collidesZ = false;
    const playerRadius = 0.35; // Standard player collision thickness

    const nextPosX = new THREE.Vector3(state.playerPos.x + finalDirection.x, state.playerPos.y, state.playerPos.z);
    const nextPosZ = new THREE.Vector3(state.playerPos.x, state.playerPos.y, state.playerPos.z + finalDirection.z);

    for (let i = 0; i < state.instancedColliders.length; i++) {
        const col = state.instancedColliders[i];
        
        // 2D distance calculation on X-Z plane
        const dxX = nextPosX.x - col.position.x;
        const dzX = nextPosX.z - col.position.z;
        const distSqX = dxX * dxX + dzX * dzX;
        const minDist = playerRadius + col.radius;
        
        if (distSqX < minDist * minDist) {
            collidesX = true;
        }

        const dxZ = nextPosZ.x - col.position.x;
        const dzZ = nextPosZ.z - col.position.z;
        const distSqZ = dxZ * dxZ + dzZ * dzZ;
        
        if (distSqZ < minDist * minDist) {
            collidesZ = true;
        }
        
        if (collidesX && collidesZ) break;
    }

    // Raycast collision detection against static maze walls
    const origin = new THREE.Vector3(state.playerPos.x, 0.5, state.playerPos.z);

    if (!collidesX) {
        const rayX = new THREE.Raycaster(origin, new THREE.Vector3(Math.sign(finalDirection.x), 0, 0), 0, CONFIG.COLLISION_MARGIN);
        if (rayX.intersectObjects(state.mazeObjects, false).length === 0) {
            state.playerPos.x += finalDirection.x;
        }
    }

    if (!collidesZ) {
        const rayZ = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, Math.sign(finalDirection.z)), 0, CONFIG.COLLISION_MARGIN);
        if (rayZ.intersectObjects(state.mazeObjects, false).length === 0) {
            state.playerPos.z += finalDirection.z;
        }
    }
}

export function updatePlayerAnimation(delta) {
    if (!state.playerBody || !state.playerBody.visible) return;

    if (state.playerBody.torchMesh) {
        state.playerBody.torchMesh.visible = state.hasTorch;
        if (state.playerBody.torchMesh.flame) {
            state.playerBody.torchMesh.flame.visible = state.torchOn;
        }
    }

    const isFlying = state.flyMode;
    const isMoving = state.KEY.w || state.KEY.s || state.KEY.a || state.KEY.d;
    const isSprinting = state.KEY.shift;

    const swingSpeed = isSprinting ? 12 : 8.5;
    const maxLegSwing = isSprinting ? 0.65 : 0.42;
    const maxArmSwing = isSprinting ? 0.55 : 0.35;

    if (isFlying) {
        // Floating animation
        const floatTime = state.clock.getElapsedTime() * 2.0;
        
        const targetLegRot = 0.15 + Math.sin(floatTime) * 0.05;
        state.playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftLegJoint.rotation.x, targetLegRot, 0.1);
        state.playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightLegJoint.rotation.x, targetLegRot - 0.05, 0.1);

        const targetArmRotX = 0.2 + Math.cos(floatTime) * 0.08;
        const targetArmRotZLeft = -0.35 + Math.sin(floatTime) * 0.05;
        const targetArmRotZRight = 0.35 - Math.sin(floatTime) * 0.05;

        state.playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftArmJoint.rotation.x, targetArmRotX, 0.1);
        state.playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightArmJoint.rotation.x, targetArmRotX, 0.1);
        state.playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.leftArmJoint.rotation.z, targetArmRotZLeft, 0.1);
        state.playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.rightArmJoint.rotation.z, targetArmRotZRight, 0.1);

        state.playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftElbowJoint.rotation.x, 0.25, 0.1);
        state.playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightElbowJoint.rotation.x, 0.25, 0.1);

        state.playerBody.torso.rotation.y = THREE.MathUtils.lerp(state.playerBody.torso.rotation.y, 0, 0.1);
    } else if (isMoving) {
        walkTimer += delta * swingSpeed;
        
        state.playerBody.leftLegJoint.rotation.x = Math.sin(walkTimer) * maxLegSwing;
        state.playerBody.rightLegJoint.rotation.x = -Math.sin(walkTimer) * maxLegSwing;

        state.playerBody.rightArmJoint.rotation.x = 0.15 + Math.sin(walkTimer) * maxArmSwing;
        state.playerBody.leftArmJoint.rotation.x = 0.15 - Math.sin(walkTimer) * maxArmSwing;

        state.playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.rightArmJoint.rotation.z, 0.35, 0.1);
        state.playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.leftArmJoint.rotation.z, -0.35, 0.1);

        state.playerBody.rightElbowJoint.rotation.x = 0.1 + (Math.sin(walkTimer + Math.PI/2) * 0.15 + 0.15);
        state.playerBody.leftElbowJoint.rotation.x = 0.1 + (Math.sin(-walkTimer + Math.PI/2) * 0.15 + 0.15);

        state.playerBody.torso.rotation.y = Math.sin(walkTimer) * 0.06;
    } else {
        const lerpFactor = 0.18;
        state.playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftLegJoint.rotation.x, 0, lerpFactor);
        state.playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightLegJoint.rotation.x, 0, lerpFactor);
        
        state.playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightArmJoint.rotation.x, 0.15, lerpFactor);
        state.playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftArmJoint.rotation.x, 0.15, lerpFactor);

        state.playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.rightArmJoint.rotation.z, 0.35, lerpFactor);
        state.playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(state.playerBody.leftArmJoint.rotation.z, -0.35, lerpFactor);

        state.playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.rightElbowJoint.rotation.x, 0.1, lerpFactor);
        state.playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(state.playerBody.leftElbowJoint.rotation.x, 0.1, lerpFactor);

        state.playerBody.torso.rotation.y = THREE.MathUtils.lerp(state.playerBody.torso.rotation.y, 0, lerpFactor);
    }
}
