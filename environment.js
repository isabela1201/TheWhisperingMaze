// environment.js
// Handles light creation, day-night cycle, wall torches, and optimized nature generation

import * as THREE from 'three';
import { getGLTFLoader } from './loaderHelper.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import * as state from './state.js';
import { S } from './state.js';
import { SkyEnvironment } from './sky.js';
import { updateWhispers } from './particles.js';
import { updatePlayerAnimation } from './player.js';

export function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    state.scene.add(ambientLight);
    S.setAmbientLight(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    state.scene.add(hemiLight);
    S.setHemiLight(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff0f0, 1.0);
    sunLight.position.set(20, 50, 20);
    sunLight.castShadow = true;
    
    // Potato Shadows: Extreme optimization (render shadows only around the player)
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.mapSize.width = 512; // Optimized from 1024 for low-end GPUs
    sunLight.shadow.mapSize.height = 512;
    state.scene.add(sunLight.target);
    state.scene.add(sunLight);
    S.setSunLight(sunLight);

    const torch = new THREE.SpotLight(0xfffee0, 0, 18, Math.PI / 7, 0.35, 2);
    state.scene.add(torch);
    state.scene.add(torch.target);
    state.scene.add(state.camera);
    S.setTorch(torch);
}

export function setupDayNightCycle() {
    S.setDayPhases([
        { // 0 — Dawn (Amanhecer — pêssego pálido e rosa-orvalho delicado)
            sunColor: new THREE.Color(0xfff0d8), sunIntensity: 1.0,
            sunPos: new THREE.Vector3(50, 15, 20),
            ambientColor: new THREE.Color(0xfde8d8), ambientIntensity: 0.42,
            hemiSky: new THREE.Color(0xf8e8da),   // pêssego claro no topo
            hemiGround: new THREE.Color(0xb8c8a8), // verde musgo suave no chão
            fogColor: new THREE.Color(0xf0e0ee),   // névoa rosada muito clara
            fogNear: 20, fogFar: 85,
            exposure: 0.85, mazeEmissive: 0.03, whisperMult: 0.9,
        },
        { // 1 — Noon (Dia — azul céu limpo e fresco)
            sunColor: new THREE.Color(0xffffff), sunIntensity: 1.5,
            sunPos: new THREE.Vector3(2, 70, 5),
            ambientColor: new THREE.Color(0xf4f8ff), ambientIntensity: 0.58,
            hemiSky: new THREE.Color(0xc0daf0),    // azul céu claro (o tom que queres!)
            hemiGround: new THREE.Color(0xb4ccb0),  // verde erva pálido
            fogColor: new THREE.Color(0xd4ebf8),    // azul muito leve e cristalino
            fogNear: 25, fogFar: 100,
            exposure: 0.95, mazeEmissive: 0.0, whisperMult: 0.5,
        },
        { // 2 — Sunset (Pôr-do-sol — lavanda suave com ouro pálido)
            sunColor: new THREE.Color(0xfde8c0), sunIntensity: 0.95,
            sunPos: new THREE.Vector3(-50, 12, 20),
            ambientColor: new THREE.Color(0xece0f4), ambientIntensity: 0.38,
            hemiSky: new THREE.Color(0xe0d0f0),    // violeta muito pálido e suave
            hemiGround: new THREE.Color(0xa89898),  // terra rosada
            fogColor: new THREE.Color(0xe8d8f0),    // névoa lavanda delicada
            fogNear: 18, fogFar: 78,
            exposure: 0.82, mazeEmissive: 0.07, whisperMult: 1.3,
        },
        { // 3 — Night (Noite — índigo suave como tinta diluída, estrelas distantes)
            sunColor: new THREE.Color(0xd0d8f0), sunIntensity: 0.45, // luar suave azul-prata
            sunPos: new THREE.Vector3(5, 45, -30),
            ambientColor: new THREE.Color(0x8890b8), ambientIntensity: 0.22, // índigo esbatido
            hemiSky: new THREE.Color(0x7080a8),    // azul-índigo profundo mas não negro
            hemiGround: new THREE.Color(0x303850),  // roxo escuro no chão
            fogColor: new THREE.Color(0x9090c0),    // névoa índigo/azul-cinza
            fogNear: 16, fogFar: 58,
            exposure: 0.68, mazeEmissive: 0.30, whisperMult: 2.2,
        },
    ]);
}

export function updateDayNight(t) {
    if (!state.DAY_PHASES || !state.sunLight) return;
    const n = (t % state.DAY_CYCLE_DURATION) / state.DAY_CYCLE_DURATION; // 0..1
    const f = n * state.DAY_PHASES.length;
    const i = Math.floor(f) % state.DAY_PHASES.length;
    const j = (i + 1) % state.DAY_PHASES.length;
    const lf = f - Math.floor(f);                              // 0..1 segment fraction
    const A = state.DAY_PHASES[i], B = state.DAY_PHASES[j];
    const ls = (a, b) => a + (b - a) * lf;                    // LERP helper

    S.setCurrentPhase(state.DAY_PHASE_NAMES[i]);

    // Sun / Moon color, intensity, and direction
    state.sunLight.color.copy(A.sunColor).lerp(B.sunColor, lf);
    state.sunLight.intensity = ls(A.sunIntensity, B.sunIntensity);
    state.sunLight.position.lerpVectors(A.sunPos, B.sunPos, lf);

    // Ambient light
    state.ambientLight.color.copy(A.ambientColor).lerp(B.ambientColor, lf);
    state.ambientLight.intensity = ls(A.ambientIntensity, B.ambientIntensity);

    // Hemisphere light
    state.hemiLight.color.copy(A.hemiSky).lerp(B.hemiSky, lf);
    state.hemiLight.groundColor.copy(A.hemiGround).lerp(B.hemiGround, lf);

    // Fog + sky background color
    state.scene.fog.color.copy(A.fogColor).lerp(B.fogColor, lf);
    state.scene.fog.near = ls(A.fogNear, B.fogNear);
    state.scene.fog.far = ls(A.fogFar, B.fogFar);
    state.scene.background.copy(A.fogColor).lerp(B.fogColor, lf);

    // Exposure
    state.renderer.toneMappingExposure = ls(A.exposure, B.exposure);

    // Emissive intensity of maze materials
    const emissive = ls(A.mazeEmissive, B.mazeEmissive);
    state.mazeMaterials.forEach(mat => { mat.emissiveIntensity = emissive; });

    // Fireflies intensity multiplier
    S.setWhisperBrightnessMult(ls(A.whisperMult, B.whisperMult));

    // Skybox environment updates
    if (typeof SkyEnvironment !== 'undefined' && typeof SkyEnvironment.update === 'function') {
        SkyEnvironment.update(n, state.sunLight.position);
    }
}

export function buildTorchMesh(position, normal, index) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.lookAt(position.clone().add(normal));

    const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff4400,
        emissiveIntensity: 3.0,
        flatShading: true,
        transparent: true,
        opacity: 0.95
    });

    const torchSubGroup = new THREE.Group();
    torchSubGroup.position.set(0, 0.02, 0.1);
    torchSubGroup.rotation.x = Math.PI / 8;
    group.add(torchSubGroup);

    // Dynamic Flame Mesh
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), flameMat);
    flame.position.set(0, 0.33, 0);
    torchSubGroup.add(flame);

    // Embedded SpotLight (flickering dynamics remain unchanged)
    const spotLight = new THREE.SpotLight(0xffaa00, 0, 7.5, Math.PI / 3, 0.8, 2.0);
    spotLight.position.set(0, 0.33, 0);
    spotLight.castShadow = false;
    torchSubGroup.add(spotLight);

    // Target pointing straight out from the wall along local +Z axis
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0.33, 1.0);
    torchSubGroup.add(spotTarget);
    spotLight.target = spotTarget;

    // Invisible collider cylinder for raycasting (replaces the brackets in raycast intersection)
    const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
    const colliderMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 4), colliderMat);
    colliderMesh.position.set(0, 0.15, 0.05);
    torchSubGroup.add(colliderMesh);

    group.userData = {
        isWallTorch: true,
        active: true,
        id: index,
        flame: flame,
        baseScale: 1.0
    };

    group.spotLight = spotLight;
    group.torchSubGroup = torchSubGroup;

    return group;
}

export function createWallTorches() {
    const mazeBox = new THREE.Box3();
    state.mazeObjects.forEach(obj => {
        if (obj.isInstancedMesh) return;
        if (obj.name.toLowerCase().includes('tree') || obj.name.toLowerCase().includes('bush') || obj.name.toLowerCase().includes('door')) return;
        try {
            const b = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            b.getSize(size);
            // Skip helper objects / skyboxes / meshes with huge dimensions
            if (size.x > 300 || size.z > 300) return;

            if (!b.isEmpty() && isFinite(b.min.x) && isFinite(b.max.x)) mazeBox.union(b);
        } catch(e) {}
    });

    // Safety fallback: if boundingBox is empty, invalid, or unreasonably huge (preventing millions of scan iterations)
    if (mazeBox.isEmpty() || !isFinite(mazeBox.min.x) || mazeBox.min.x < -200 || mazeBox.max.x > 200 || mazeBox.min.z < -200 || mazeBox.max.z > 200) {
        console.warn(`[Tochas] BoundingBox de mazeObjects fora do limite razoável (minX=${mazeBox.min.x.toFixed(1)}, maxX=${mazeBox.max.x.toFixed(1)}). A aplicar fallback seguro.`);
        mazeBox.min.set(-25, -1, -25);
        mazeBox.max.set(25, 5, 25);
    }
    
    const minX = mazeBox.min.x;
    const maxX = mazeBox.max.x;
    const minZ = mazeBox.min.z;
    const maxZ = mazeBox.max.z;

    const gridSpacing = 4.5;
    const raycaster = new THREE.Raycaster();
    const scanHeight = 1.0;
    
    const directions = [
        { dir: new THREE.Vector3(0, 0, 1) },   // North
        { dir: new THREE.Vector3(0, 0, -1) },  // South
        { dir: new THREE.Vector3(1, 0, 0) },   // East
        { dir: new THREE.Vector3(-1, 0, 0) },  // West
    ];

    const torchLocations = [];
    const alvosRaycaster = [...state.mazeObjects];

    for (let x = minX + 1.5; x <= maxX - 1.5; x += gridSpacing) {
        for (let z = minZ + 1.5; z <= maxZ - 1.5; z += gridSpacing) {
            const startPt = new THREE.Vector3(x, scanHeight, z);
            
            for (let d of directions) {
                raycaster.set(startPt, d.dir);
                raycaster.far = gridSpacing * 0.6;
                
                const intersects = raycaster.intersectObjects(alvosRaycaster, true);
                if (intersects.length > 0) {
                    const hit = intersects[0];
                    const dist = hit.distance;
                    
                    const torchPos = startPt.clone().addScaledVector(d.dir, dist - 0.05);
                    torchPos.y = 1.35; // Standard height
                    
                    const normalWorld = hit.face.normal.clone();
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    normalWorld.applyMatrix3(normalMatrix).normalize();
                    
                    if (Math.abs(normalWorld.y) < 0.3) {
                        if (normalWorld.dot(d.dir) < 0) {
                            torchPos.addScaledVector(normalWorld, 0.05);
                            
                            let tooClose = false;
                            for (let loc of torchLocations) {
                                if (loc.position.distanceTo(torchPos) < 5.0) {
                                    tooClose = true;
                                    break;
                                }
                            }
                            
                            if (!tooClose) {
                                torchLocations.push({
                                    position: torchPos,
                                    normal: normalWorld
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    const N = torchLocations.length;
    if (N === 0) {
        console.log(`[Tochas] 0 tochas encontradas para instanciamento.`);
        return;
    }

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

    // Merge metal bracket and cage geometries locally (centered at 0,0,0)
    const geometriesToMerge = [];

    // 1. Base Plate
    const basePlateGeo = new THREE.BoxGeometry(0.08, 0.14, 0.02);
    basePlateGeo.translate(0, 0, -0.01);
    geometriesToMerge.push(basePlateGeo);

    // 2. armLower
    const armLowerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5);
    const armLowerMat = new THREE.Matrix4().makeRotationX(Math.PI / 4).setPosition(0, -0.03, 0.04);
    armLowerGeo.applyMatrix4(armLowerMat);
    geometriesToMerge.push(armLowerGeo);

    // 3. armUpper
    const armUpperGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 5);
    const armUpperMat = new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.025, 0.07);
    armUpperGeo.applyMatrix4(armUpperMat);
    geometriesToMerge.push(armUpperGeo);

    // 4. collar
    const collarGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6, 1, true);
    const collarMatTransform = new THREE.Matrix4().makeRotationX(Math.PI / 8).setPosition(0, 0.025, 0.1);
    collarGeo.applyMatrix4(collarMatTransform);
    geometriesToMerge.push(collarGeo);

    // Subgroup matrix (tilts torch outward)
    const subGroupMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0.02, 0.1),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 8),
        new THREE.Vector3(1, 1, 1)
    );

    // 5. Cup
    const cupGeo = new THREE.CylinderGeometry(0.045, 0.025, 0.08, 6);
    cupGeo.translate(0, 0.21, 0);
    cupGeo.applyMatrix4(subGroupMatrix);
    geometriesToMerge.push(cupGeo);

    // 6. Top Ring
    const topRingGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 6, 1, true);
    topRingGeo.translate(0, 0.32, 0);
    topRingGeo.applyMatrix4(subGroupMatrix);
    geometriesToMerge.push(topRingGeo);

    // 7. Cage Ribs (6)
    for (let i = 0; i < 6; i++) {
        const ribGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4);
        const angle = (i * Math.PI) / 3;
        const radiusTop = 0.055;
        const radiusBottom = 0.045;
        const rx = Math.cos(angle) * (radiusTop + radiusBottom) / 2;
        const ry = 0.27;
        const rz = Math.sin(angle) * (radiusTop + radiusBottom) / 2;
        
        const ribMatrix = new THREE.Matrix4().compose(
            new THREE.Vector3(rx, ry, rz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(angle) * 0.12, 0, -Math.sin(angle) * 0.12)),
            new THREE.Vector3(1, 1, 1)
        );
        ribGeo.applyMatrix4(ribMatrix);
        ribGeo.applyMatrix4(subGroupMatrix);
        geometriesToMerge.push(ribGeo);
    }

    const mergedMetalGeo = BufferGeometryUtils.mergeGeometries(geometriesToMerge);
    
    // Wooden handle
    const handleGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.35, 6);
    handleGeo.applyMatrix4(subGroupMatrix);

    // Pitch Core
    const pitchGeo = new THREE.DodecahedronGeometry(0.035);
    pitchGeo.translate(0, 0.24, 0);
    pitchGeo.applyMatrix4(subGroupMatrix);

    // Create the three InstancedMeshes
    const instancedMetal = new THREE.InstancedMesh(mergedMetalGeo, metalMat, N);
    instancedMetal.castShadow = true;
    instancedMetal.receiveShadow = true;
    
    const instancedHandle = new THREE.InstancedMesh(handleGeo, handleMat, N);
    instancedHandle.castShadow = true;
    instancedHandle.receiveShadow = true;

    const instancedPitch = new THREE.InstancedMesh(pitchGeo, pitchMat, N);
    instancedPitch.castShadow = true;
    instancedPitch.receiveShadow = true;

    // Position each instance
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
        const loc = torchLocations[i];
        dummy.position.copy(loc.position);
        dummy.lookAt(loc.position.clone().add(loc.normal));
        dummy.updateMatrix();

        instancedMetal.setMatrixAt(i, dummy.matrix);
        instancedHandle.setMatrixAt(i, dummy.matrix);
        instancedPitch.setMatrixAt(i, dummy.matrix);
    }

    instancedMetal.instanceMatrix.needsUpdate = true;
    instancedHandle.instanceMatrix.needsUpdate = true;
    instancedPitch.instanceMatrix.needsUpdate = true;

    state.scene.add(instancedMetal);
    state.scene.add(instancedHandle);
    state.scene.add(instancedPitch);

    // Spawn the dynamic components (flame, spotlight, collider) for each location
    for (let i = 0; i < N; i++) {
        const loc = torchLocations[i];
        const torchGroup = buildTorchMesh(loc.position, loc.normal, i);
        state.scene.add(torchGroup);
        
        torchGroup.updateMatrixWorld(true);
        const worldFlamePos = new THREE.Vector3();
        torchGroup.userData.flame.getWorldPosition(worldFlamePos);
        torchGroup.userData.lightWorldPos = worldFlamePos;
        
        state.wallTorches.push(torchGroup);
    }

    console.log(`[Tochas] ${state.wallTorches.length} tochas instanciadas e dinâmicas criadas.`);
}


export function espalharErvaGLTF(scene, mazeObjects) {
    return new Promise((resolve, reject) => {
        console.log("A carregar asset da erva...");

        const loader = getGLTFLoader();
        loader.load('assets/grass/scene.gltf', (gltf) => {
            window.updateLoadingProgress('grass', 99);
            setTimeout(() => {
                const meshesErva = [];
                
                gltf.scene.updateMatrixWorld(true);

                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        // Ignore reeds
                        if (child.material && child.material.name === "Grass_Reeds") {
                            return;
                        }

                        if (child.material) {
                            child.material.alphaTest = 0.5; 
                            child.material.transparent = false; 
                            child.material.depthWrite = true;
                            child.material.side = THREE.DoubleSide; 
                            child.material.needsUpdate = true;
                        }
                        
                        const geometry = child.geometry.clone();
                        geometry.applyMatrix4(child.matrixWorld);
                        
                        geometry.computeBoundingBox();
                        const center = new THREE.Vector3();
                        geometry.boundingBox.getCenter(center);
                        geometry.translate(-center.x, -geometry.boundingBox.min.y, -center.z);

                        meshesErva.push({ geometry: geometry, material: child.material });
                    }
                });

                if (meshesErva.length === 0) return;

                const QUANTIDADE = 25; 
                let contagem = 0;

                const instanciasArray = [];
                meshesErva.forEach(meshData => {
                    const instMesh = new THREE.InstancedMesh(meshData.geometry, meshData.material, QUANTIDADE);
                    instMesh.castShadow = false; // Disabled shadows for potato compatibility
                    instMesh.receiveShadow = false;
                    instanciasArray.push(instMesh);
                    scene.add(instMesh);
                });

                const dummy = new THREE.Object3D();
                const raycaster = new THREE.Raycaster();
                const downVector = new THREE.Vector3(0, -1, 0);

                const alvosRaycaster = [...mazeObjects];
                let floorFound = false;
                scene.children.forEach(c => {
                    if (c.isMesh && (c.name === 'floor' || (c.geometry && (c.geometry.type === 'PlaneGeometry' || c.geometry.constructor.name === 'PlaneGeometry')))) {
                        alvosRaycaster.push(c);
                        floorFound = true;
                    }
                });
                console.log(`[Erva GLTF] Alvos para raycast: ${alvosRaycaster.length} (chão encontrado: ${floorFound})`);

                scene.updateMatrixWorld(true);
                const boundingBox = new THREE.Box3();
                mazeObjects.forEach(obj => {
                    const tempBox = new THREE.Box3().setFromObject(obj);
                    const size = new THREE.Vector3();
                    tempBox.getSize(size);
                    // Skip helper objects / skyboxes / meshes with huge dimensions
                    if (size.x > 300 || size.z > 300) {
                        return;
                    }
                    boundingBox.union(tempBox);
                });

                if (boundingBox.isEmpty() || !isFinite(boundingBox.min.x)) {
                    boundingBox.min.set(-60, 0, -60);
                    boundingBox.max.set(60, 20, 60);
                }

                const minX = boundingBox.min.x; const maxX = boundingBox.max.x;
                const minZ = boundingBox.min.z; const maxZ = boundingBox.max.z;
                const alturaOrigem = isFinite(boundingBox.max.y) ? boundingBox.max.y + 10 : 20;

                console.log(`[Erva GLTF DEBUG] BoundingBox: min=(${boundingBox.min.x.toFixed(2)}, ${boundingBox.min.y.toFixed(2)}, ${boundingBox.min.z.toFixed(2)}), max=(${boundingBox.max.x.toFixed(2)}, ${boundingBox.max.y.toFixed(2)}, ${boundingBox.max.z.toFixed(2)})`);
                console.log(`[Erva GLTF DEBUG] alturaOrigem: ${alturaOrigem}`);
                
                // Direct test raycast
                const dRay = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0));
                const dHits = dRay.intersectObjects(alvosRaycaster, true);
                console.log(`[Erva GLTF DEBUG] Teste direto (0,50,0) -> encontrou ${dHits.length} interseções.`);
                dHits.forEach((h, idx) => {
                    console.log(`  Hit ${idx}: object=${h.object.name || 'sem-nome'} type=${h.object.type} point.y=${h.point.y.toFixed(2)} normalY=${h.face ? h.face.normal.y.toFixed(2) : 'N/A'}`);
                });

                let tentHits = 0;
                let tentValidos = 0;
                const maxTentativas = QUANTIDADE * 8;
                for (let i = 0; i < maxTentativas; i++) {
                    if (contagem >= QUANTIDADE) break;

                    const rx = minX + Math.random() * (maxX - minX);
                    const rz = minZ + Math.random() * (maxZ - minZ);
                    const origem = new THREE.Vector3(rx, alturaOrigem, rz);

                    raycaster.set(origem, downVector);
                    const intersetos = raycaster.intersectObjects(alvosRaycaster, true);

                    if (intersetos.length > 0) {
                        tentHits++;
                        let hit = null;
                        for (let j = 0; j < intersetos.length; j++) {
                            if (intersetos[j].face) {
                                const normalMundo = intersetos[j].face.normal.clone();
                                if (intersetos[j].object) {
                                    const matrizNormal = new THREE.Matrix3().getNormalMatrix(intersetos[j].object.matrixWorld);
                                    normalMundo.applyMatrix3(matrizNormal).normalize();
                                }
                                if (normalMundo.y > 0.8) {
                                    hit = intersetos[j];
                                    tentValidos++;
                                    break;
                                }
                            }
                        }

                        if (hit) {
                            dummy.position.set(rx, hit.point.y, rz);
                            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                            
                            const escalaGlobal = 0.6; 
                            dummy.scale.setScalar(escalaGlobal * (0.8 + Math.random() * 0.6));
                            dummy.updateMatrix();

                            instanciasArray.forEach(instMesh => {
                                instMesh.setMatrixAt(contagem, dummy.matrix);
                            });

                            contagem++;
                        }
                    }
                }

                instanciasArray.forEach(instMesh => {
                    instMesh.count = contagem;
                    instMesh.instanceMatrix.needsUpdate = true;
                    // r152+: InstancedMesh frustum culling requires an explicit bounding sphere.
                    // Without this call all instances are silently discarded by the renderer.
                    instMesh.computeBoundingSphere();
                });

                console.log(`[Erva GLTF] Foram espalhados ${contagem} tufos com sucesso. Hits raycast: ${tentHits}, Válidos (normal): ${tentValidos}`);
                window.updateLoadingProgress('grass', 100);
                resolve();
            }, 50);
        }, (xhr) => {
            const total = xhr.total || 164054;
            const p = Math.min((xhr.loaded / total) * 100, 99);
            window.updateLoadingProgress('grass', p);
        }, (error) => {
            console.error("Erro a carregar a erva GLTF:", error);
            window.updateLoadingProgress('grass', 100);
            reject(error);
        });
});
}

export function espalharFlorestaGLTF(scene, mazeObjects) {
    return new Promise((resolve, reject) => {
        console.log("A carregar asset da floresta...");

        const loader = getGLTFLoader();
        loader.load('assets/grass/various_forest_assets_pack.glb', (gltf) => {
            window.updateLoadingProgress('forest', 99);
            setTimeout(() => {
                // Three.js r184 may not name the root node 'GLTF_SceneRootNode' for all
                // exporters. Walk the tree to find the deepest group that has children
                // containing meshes — this is robust across all GLTF/GLB structural variants.
                function findAssetRoot(node) {
                    // If this node has children that themselves have children, go deeper
                    if (node.children.length === 1 && node.children[0].children.length > 0) {
                        return findAssetRoot(node.children[0]);
                    }
                    return node;
                }
                const rootNode = findAssetRoot(
                    gltf.scene.getObjectByName('GLTF_SceneRootNode') ?? gltf.scene
                );

                // Debug: log actual top-level children names for browser console inspection
                console.log('[Floresta] Raiz:', rootNode.name || '(scene)',
                    '| Filhos:', rootNode.children.length,
                    rootNode.children.slice(0,6).map(c => c.name || '?').join(', '));

                // Collect asset nodes — use direct children if available, otherwise the root itself
                const assetNodes = rootNode.children.length > 0
                    ? rootNode.children
                    : [rootNode];

                const tiposArvore = [];
                const tiposRocha = [];
                const tiposArbusto = [];

                assetNodes.forEach(assetNode => {
                    assetNode.position.set(0,0,0);
                    assetNode.updateMatrixWorld(true);
                    
                    const name = assetNode.name.toLowerCase();
                    const meshesData = [];

                    assetNode.traverse(c => {
                        if (c.isMesh) {
                            if (c.material) {
                                c.material.alphaTest = 0.5;
                                c.material.transparent = false;
                                c.material.depthWrite = true;
                                c.material.side = THREE.DoubleSide;
                            }
                            const geometry = c.geometry.clone();
                            geometry.applyMatrix4(c.matrixWorld);
                            meshesData.push({ geometry, material: c.material });
                        }
                    });

                    if (meshesData.length > 0) {
                        const assetBox = new THREE.Box3();
                        meshesData.forEach(m => {
                            m.geometry.computeBoundingBox();
                            assetBox.union(m.geometry.boundingBox);
                        });
                        const offsetY = -assetBox.min.y;
                        meshesData.forEach(m => {
                            m.geometry.translate(0, offsetY, 0);
                        });

                        if (name.includes('boulder')) tiposRocha.push(meshesData);
                        else if (name.includes('shrub') || name.includes('sapling') || name.includes('log') || name.includes('dead')) tiposArbusto.push(meshesData);
                        else tiposArvore.push(meshesData);
                    }
                });

                console.log(`[Floresta] Classificados: ${tiposArvore.length} arvores, ${tiposRocha.length} rochas, ${tiposArbusto.length} arbustos`);

                // If no assets at all, something went wrong — the GLB may have a deeply nested
                // structure. Fall back to treating every mesh found in the entire scene as a tree.
                if (tiposArvore.length === 0 && tiposRocha.length === 0 && tiposArbusto.length === 0) {
                    console.warn('[Floresta] Nenhum asset classificado — a usar traversal completo como fallback...');
                    const meshesData = [];
                    gltf.scene.traverse(c => {
                        if (c.isMesh) {
                            if (c.material) {
                                c.material.alphaTest = 0.5;
                                c.material.transparent = false;
                                c.material.depthWrite = true;
                                c.material.side = THREE.DoubleSide;
                            }
                            const geometry = c.geometry.clone();
                            c.updateMatrixWorld(true);
                            geometry.applyMatrix4(c.matrixWorld);
                            meshesData.push({ geometry, material: c.material });
                        }
                    });
                    if (meshesData.length > 0) {
                        const box = new THREE.Box3();
                        meshesData.forEach(m => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
                        const offsetY = -box.min.y;
                        meshesData.forEach(m => m.geometry.translate(0, offsetY, 0));
                        tiposArvore.push(meshesData);
                        console.log(`[Floresta] Fallback: ${meshesData.length} meshes agrupadas como uma árvore.`);
                    } else {
                        console.error('[Floresta] GLB sem meshes — impossível gerar floresta.');
                        return;
                    }
                }

                // Counts for instanced mesh generation - raised for dense boundary ring + forest scatter
                const MAX_ARVORES_TOTAIS = 180; 
                const MAX_ROCHAS_TOTAIS = 45;   
                const MAX_ARBUSTOS_TOTAIS = 35; 


                function initTipos(tiposData, maxTotal) {
                    return tiposData.map(meshesData => {
                        const limitPorTipo = Math.ceil(maxTotal / tiposData.length) + 15; 
                        const instancedMeshes = meshesData.map(m => {
                            const im = new THREE.InstancedMesh(m.geometry, m.material, limitPorTipo);
                            // HUGE POTATO OPTIMIZATION: Disable shadow casting and receiving for instanced environment assets
                            im.castShadow = false; 
                            im.receiveShadow = false;
                            scene.add(im);
                            return im;
                        });
                        return { instancedMeshes, count: 0, limit: limitPorTipo };
                    });
                }

                const instArvores = initTipos(tiposArvore, MAX_ARVORES_TOTAIS);
                const instRochas = initTipos(tiposRocha, MAX_ROCHAS_TOTAIS);
                const instArbustos = initTipos(tiposArbusto, MAX_ARBUSTOS_TOTAIS);

                const dummy = new THREE.Object3D();
                const raycaster = new THREE.Raycaster();
                const downVector = new THREE.Vector3(0, -1, 0);
                
                const alvosRaycaster = [...mazeObjects];
                let floorFound = false;
                scene.children.forEach(c => {
                    if (c.isMesh && (c.name === 'floor' || (c.geometry && (c.geometry.type === 'PlaneGeometry' || c.geometry.constructor.name === 'PlaneGeometry')))) {
                        alvosRaycaster.push(c);
                        floorFound = true;
                    }
                });
                console.log(`[Floresta] Alvos para raycast: ${alvosRaycaster.length} (chão encontrado: ${floorFound})`);

                scene.updateMatrixWorld(true);
                const mazeBox = new THREE.Box3();
                mazeObjects.forEach((obj, idx) => {
                    const tempBox = new THREE.Box3().setFromObject(obj);
                    const size = new THREE.Vector3();
                    tempBox.getSize(size);
                    
                    // Skip helper objects / skyboxes / meshes with huge dimensions
                    if (size.x > 300 || size.z > 300) {
                        console.warn(`[Floresta DEBUG] A ignorar objeto com dimensões gigantescas do cálculo de limites: nome=${obj.name || 'sem-nome'}, tipo=${obj.type}, size=(${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)})`);
                        return;
                    }
                    
                    console.log(`  [Floresta DEBUG] Objeto ${idx}: nome=${obj.name || 'sem-nome'}, tipo=${obj.type}, min=(${tempBox.min.x.toFixed(1)}, ${tempBox.min.y.toFixed(1)}, ${tempBox.min.z.toFixed(1)}), max=(${tempBox.max.x.toFixed(1)}, ${tempBox.max.y.toFixed(1)}, ${tempBox.max.z.toFixed(1)})`);
                    mazeBox.union(tempBox);
                });

                // Safety fallback: if boundingBox is empty, invalid, or unreasonably huge (e.g. due to sky/helper objects or loaded models with huge bounds)
                let boundsValid = true;
                if (mazeBox.isEmpty() || !isFinite(mazeBox.min.x) || mazeBox.min.x < -200 || mazeBox.max.x > 200 || mazeBox.min.z < -200 || mazeBox.max.z > 200) {
                    console.warn(`[Floresta] BoundingBox de mazeObjects fora do limite razoável (minX=${mazeBox.min.x.toFixed(1)}, maxX=${mazeBox.max.x.toFixed(1)}). A aplicar fallback seguro.`);
                    mazeBox.min.set(-60, 0, -60);
                    mazeBox.max.set(60, 20, 60);
                    boundsValid = false;
                }

                let raioLabirinto = Math.max(Math.abs(mazeBox.min.x), Math.abs(mazeBox.max.x), Math.abs(mazeBox.min.z), Math.abs(mazeBox.max.z));
                if (raioLabirinto > 150) {
                    console.warn(`[Floresta] raioLabirinto (${raioLabirinto.toFixed(1)}) excede o limite. A usar valor padrão de 39.`);
                    raioLabirinto = 29;
                }
                
                const raioFlorestaExterior = raioLabirinto + 60; 
                
                let safeMaxY = 15;
                if (isFinite(mazeBox.max.y) && mazeBox.max.y < 100) {
                    safeMaxY = mazeBox.max.y;
                } else {
                    console.warn(`[Floresta] alturaOrigem com valor inválido ou muito grande. A usar padrão de 25.`);
                }
                const alturaOrigem = safeMaxY + 10;

                const minX = mazeBox.min.x;
                const maxX = mazeBox.max.x;
                const minZ = mazeBox.min.z;
                const maxZ = mazeBox.max.z;

                console.log(`[Floresta DEBUG] mazeBox final: min=(${minX.toFixed(2)}, ${mazeBox.min.y.toFixed(2)}, ${minZ.toFixed(2)}), max=(${maxX.toFixed(2)}, ${mazeBox.max.y.toFixed(2)}, ${maxZ.toFixed(2)})`);
                console.log(`[Floresta DEBUG] raioLabirinto=${raioLabirinto.toFixed(2)}, raioFlorestaExterior=${raioFlorestaExterior.toFixed(2)}, alturaOrigem=${alturaOrigem}`);
                
                // Direct test raycast for forest
                const dRay = new THREE.Raycaster(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0));
                const dHits = dRay.intersectObjects(alvosRaycaster, true);
                console.log(`[Floresta DEBUG] Teste direto (0,50,0) -> encontrou ${dHits.length} interseções.`);
                dHits.forEach((h, idx) => {
                    console.log(`  Hit ${idx}: object=${h.object.name || 'sem-nome'} type=${h.object.type} point.y=${h.point.y.toFixed(2)} normalY=${h.face ? h.face.normal.y.toFixed(2) : 'N/A'}`);
                });

                let totalArvoresIn = 0;
                const posArvores = []; 
                let tentHits = 0;
                let tentValidos = 0;

                // Phase 1: Dense Boundary Ring just outside the circular maze limits (acting as a natural border wall)
                const PASSOS_ANEL = 90;
                const BORDER_MARGIN = 5;   // <--- ADJUST THIS to change how close the forest is to the walls (smaller/negative = closer, e.g., 0.1 or -0.5)
                const BORDER_THICKNESS = 12; // <--- ADJUST THIS to change how wide/thick the forest boundary is (in meters)

                for (let step = 0; step < PASSOS_ANEL; step++) {
                    const angulo = (step / PASSOS_ANEL) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
                    // Spawn in a snug circular band surrounding the outer wall
                    const r = raioLabirinto + BORDER_MARGIN + Math.random() * BORDER_THICKNESS;
                    const rx = Math.cos(angulo) * r;
                    const rz = Math.sin(angulo) * r;

                    const origem = new THREE.Vector3(rx, alturaOrigem, rz);

                    raycaster.set(origem, downVector);
                    const intersetos = raycaster.intersectObjects(alvosRaycaster, true);

                    if (intersetos.length > 0) {
                        let hit = null;
                        for (let j = 0; j < intersetos.length; j++) {
                            if (intersetos[j].face) {
                                const normalMundo = intersetos[j].face.normal.clone();
                                if (intersetos[j].object) {
                                    const matrizNormal = new THREE.Matrix3().getNormalMatrix(intersetos[j].object.matrixWorld);
                                    normalMundo.applyMatrix3(matrizNormal).normalize();
                                }
                                if (normalMundo.y > 0.8) {
                                    hit = intersetos[j];
                                    tentValidos++;
                                    break;
                                }
                            }
                        }

                        if (hit) {
                            tentHits++;
                            let targetCategoria = null;
                            const rand = Math.random();
                            if (rand < 0.65) {
                                targetCategoria = instArvores;
                            } else if (rand < 0.85) {
                                targetCategoria = instRochas;
                            } else {
                                targetCategoria = instArbustos;
                            }

                            if (targetCategoria === instArvores) {
                                let overlap = false;
                                for (let j = 0; j < posArvores.length; j++) {
                                    if (posArvores[j].distanceToSquared(hit.point) < 9.0) { // ~3 meters
                                        overlap = true; break;
                                    }
                                }
                                if (overlap) {
                                    targetCategoria = null;
                                } else {
                                    posArvores.push(hit.point.clone());
                                }
                            }

                            if (targetCategoria) {
                                const tipoAtivo = targetCategoria[Math.floor(Math.random() * targetCategoria.length)];
                                if (tipoAtivo.count < tipoAtivo.limit) {
                                    dummy.position.set(rx, hit.point.y, rz);
                                    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                                    dummy.scale.setScalar(1.2 + (Math.random() - 0.5) * 0.4); // slightly bigger trees/rocks for the border wall
                                    dummy.updateMatrix();
                                    tipoAtivo.instancedMeshes.forEach(im => {
                                        im.setMatrixAt(tipoAtivo.count, dummy.matrix);
                                    });
                                    tipoAtivo.count++;
                                }
                            }
                        }
                    }
                }

                // Phase 2: General Forest Scatter (inside the maze and in the far exterior)
                const TENTATIVAS = 400;
                for (let i = 0; i < TENTATIVAS; i++) {
                    const angulo = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(Math.random()) * raioFlorestaExterior; 
                    const rx = Math.cos(angulo) * r;
                    const rz = Math.sin(angulo) * r;
                    const origem = new THREE.Vector3(rx, alturaOrigem, rz);

                    raycaster.set(origem, downVector);
                    const intersetos = raycaster.intersectObjects(alvosRaycaster, true);

                    if (intersetos.length > 0) {
                        let hit = null;
                        for (let j = 0; j < intersetos.length; j++) {
                            if (intersetos[j].face) {
                                const normalMundo = intersetos[j].face.normal.clone();
                                if (intersetos[j].object) {
                                    const matrizNormal = new THREE.Matrix3().getNormalMatrix(intersetos[j].object.matrixWorld);
                                    normalMundo.applyMatrix3(matrizNormal).normalize();
                                }
                                if (normalMundo.y > 0.8) {
                                    hit = intersetos[j];
                                    tentValidos++;
                                    break;
                                }
                            }
                        }

                        if (hit) {
                            tentHits++;
                            const distCentro = Math.sqrt(rx * rx + rz * rz);
                            const isInside = distCentro < raioLabirinto;

                            let targetCategoria = null;

                            if (isInside) {
                                // Inside maze
                                const dirLado = new THREE.Vector3(Math.cos(Math.random() * Math.PI * 2), 0, Math.sin(Math.random() * Math.PI * 2));
                                raycaster.set(new THREE.Vector3(rx, hit.point.y + 0.5, rz), dirLado);
                                const paredes = raycaster.intersectObjects(mazeObjects, true);
                                const distParede = (paredes.length > 0) ? paredes[0].distance : 999;

                                // Only spawn near walls to keep corridors clear
                                if (distParede > 0.2 && distParede < 1.0) {
                                    if (totalArvoresIn < 20 && Math.random() < 0.8) {
                                        targetCategoria = instArvores;
                                        totalArvoresIn++;
                                    } 
                                }
                            } else {
                                // Outside maze (Forest) - lower spawn rates here since Phase 1 handles the dense border
                                if (Math.random() < 0.08) { 
                                    targetCategoria = instArvores;
                                } else if (Math.random() < 0.02) {
                                    targetCategoria = instRochas; 
                                } else if (Math.random() < 0.02) {
                                    targetCategoria = instArbustos;
                                }
                            }

                            if (targetCategoria === instArvores) {
                                let overlap = false;
                                for (let j = 0; j < posArvores.length; j++) {
                                    if (posArvores[j].distanceToSquared(hit.point) < 20.0) { // ~4.5 meters
                                        overlap = true; break;
                                    }
                                }
                                if (overlap) {
                                    targetCategoria = null;
                                    if (isInside) totalArvoresIn--;
                                } else {
                                    posArvores.push(hit.point.clone());
                                }
                            }

                            if (targetCategoria) {
                                const tipoAtivo = targetCategoria[Math.floor(Math.random() * targetCategoria.length)];
                                
                                if (tipoAtivo.count < tipoAtivo.limit) {
                                    dummy.position.set(rx, hit.point.y, rz);
                                    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                                    
                                    const variacao = (isInside && targetCategoria === instArvores) ? 0.3 : 0.5;
                                    dummy.scale.setScalar(1.0 + (Math.random() - 0.5) * variacao);
                                    dummy.updateMatrix();

                                    tipoAtivo.instancedMeshes.forEach(im => {
                                        // Double safety: make sure count stays within limit
                                        if (tipoAtivo.count < im.count) {
                                            im.setMatrixAt(tipoAtivo.count, dummy.matrix);
                                        } else {
                                            im.setMatrixAt(tipoAtivo.count, dummy.matrix);
                                        }
                                    });
                                    tipoAtivo.count++;
                                }
                            }
                        }
                    }
                }

                const cleanInst = (categoria, addCollision, isTree = false, isRock = false) => {
                    categoria.forEach(t => {
                        t.instancedMeshes.forEach((im, imIdx) => {
                            im.count = t.count;
                            im.instanceMatrix.needsUpdate = true;
                            // r152+: must call computeBoundingSphere() or instances are frustum-culled
                            // and never rendered (the root cause of invisible trees/bushes).
                            im.computeBoundingSphere();
                            
                            // Only add colliders once per asset instance (using the first instanced mesh of the group)
                            if (addCollision && imIdx === 0) {
                                const matrix = new THREE.Matrix4();
                                const position = new THREE.Vector3();
                                const rotation = new THREE.Quaternion();
                                const scale = new THREE.Vector3();
                                
                                for (let i = 0; i < im.count; i++) {
                                    im.getMatrixAt(i, matrix);
                                    matrix.decompose(position, rotation, scale);
                                    
                                    // Estimate collision radius based on type and scale
                                    const baseRadius = isTree ? 0.22 : (isRock ? 0.65 : 0.45);
                                    const scaledRadius = baseRadius * scale.x;
                                    
                                    state.instancedColliders.push({
                                        position: position.clone(),
                                        radius: scaledRadius
                                    });
                                }
                            }
                        });
                    });
                };
                cleanInst(instArvores, true, true, false); 
                cleanInst(instRochas, true, false, true);
                cleanInst(instArbustos, true, false, false);

                console.log(`[Floresta] Geração concluída. Arvores=${instArvores.reduce((a,b)=>a+b.count,0)}, Rochas=${instRochas.reduce((a,b)=>a+b.count,0)}, Arbustos=${instArbustos.reduce((a,b)=>a+b.count,0)}. Hits raycast: ${tentHits}, Válidos (normal): ${tentValidos}`);
                window.updateLoadingProgress('forest', 100);
                resolve();
            }, 50);
        }, (xhr) => {
        const total = xhr.total || 40462192;
        const p = Math.min((xhr.loaded / total) * 100, 99);
        window.updateLoadingProgress('forest', p);
    }, (err) => {
        console.error(err);
        window.updateLoadingProgress('forest', 100);
        reject(err);
    });
});
}

export function updateAnimations() {
    const t = state.clock.getElapsedTime();
    const delta = t - state.whisperPrevTime;
    S.setWhisperPrevTime(t);

    updateWhispers(t, delta);
    updateDayNight(t);
    updatePlayerAnimation(delta);

    // Vegetação (Abanar com vento)
    state.vegetation.forEach(plant => {
        plant.rotation.z = Math.sin(t + plant.position.x) * 0.03;
    });
}

export function setTorchesColor(hexColor) {
    if (!state.wallTorches) return;
    const c = new THREE.Color(hexColor);
    state.wallTorches.forEach(torchGroup => {
        if (torchGroup.userData.flame) {
            torchGroup.userData.flame.material.color.copy(c);
            torchGroup.userData.flame.material.emissive.copy(c);
        }
        if (torchGroup.spotLight) {
            torchGroup.spotLight.color.copy(c);
        }
    });
}

// Adiciona no final do environment.js
export function espalharCogumelosOptimizado(scene, mazeObjects, totalMushroomsRequested = 400) {
    return new Promise((resolve) => {
        console.log("A gerar o 'Mushroom Atlas' procedimental...");

        // FUNÇÃO GENERATIVA (Inspirada no artigo do HackerNoon)
        function criarCogumeloGenerativo(corBaseHex) {
            const baseColor = new THREE.Color(corBaseHex);
            const stipeColor = new THREE.Color(0xe8dcc7); // Cor de creme para o caule (Stipe)

            // 1. STIPE (Caule)
            // Começamos com um cilindro, mas vamos deformá-lo como uma spline (curva)
            const stipeRadius = 0.02 + Math.random() * 0.02;
            const stipeHeight = 0.15 + Math.random() * 0.15;
            const stipeGeo = new THREE.CylinderGeometry(stipeRadius*0.6, stipeRadius, stipeHeight, 16, 16);
            stipeGeo.translate(0, stipeHeight / 2, 0); // Base no Y=0

            const sPos = stipeGeo.attributes.position;
            const sColor = new Float32Array(sPos.count * 3);
            
            // "Stipe noise" do artigo
            const bendX = (Math.random() - 0.5) * 0.1;
            const bendZ = (Math.random() - 0.5) * 0.1;

            for (let i = 0; i < sPos.count; i++) {
                let x = sPos.getX(i), y = sPos.getY(i), z = sPos.getZ(i);
                let t = y / stipeHeight; // Altura relativa (0 a 1)
                
                // Ruído no raio (Deixa o caule irregular)
                let radiusNoise = 1 + (1 - t) * (Math.random() * 0.15);
                x *= radiusNoise; 
                z *= radiusNoise;

                // Curvatura da spline
                x += Math.sin(t * Math.PI) * bendX;
                z += Math.sin(t * Math.PI) * bendZ;
                sPos.setXYZ(i, x, y, z);

                // Ruído de cor (Pinta os vértices criando uma textura processual)
                let cNoise = Math.random() * 0.08;
                sColor[i*3]   = stipeColor.r - cNoise - (t * 0.1);
                sColor[i*3+1] = stipeColor.g - cNoise - (t * 0.1);
                sColor[i*3+2] = stipeColor.b - cNoise - (t * 0.1);
            }
            stipeGeo.setAttribute('color', new THREE.BufferAttribute(sColor, 3));

            // 2. CAP (Chapéu)
            const capRadius = stipeRadius * 2 + Math.random() * 0.1;
            const capHeight = 0.04 + Math.random() * 0.08;
            // Usamos meia esfera como base da superfície polar
            const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            capGeo.scale(1, capHeight / capRadius, 1);
            
            // Colocar o chapéu no topo exato da inclinação do caule
            const topX = Math.sin(1 * Math.PI) * bendX;
            const topZ = Math.sin(1 * Math.PI) * bendZ;
            capGeo.translate(topX, stipeHeight - 0.02, topZ); 

            const cPos = capGeo.attributes.position;
            const cColor = new Float32Array(cPos.count * 3);
            
            // Parâmetros de ruído do artigo para a superfície
            const seed = Math.random() * 100;
            const freqRadial = 3 + Math.floor(Math.random() * 5); // Quantas ondas nas pontas
            const distorcaoNormal = Math.random() * 0.03;

            for (let i = 0; i < cPos.count; i++) {
                let x = cPos.getX(i), y = cPos.getY(i), z = cPos.getZ(i);
                
                // Coordenadas Polares (a0, t0 do artigo)
                let localX = x - topX; let localZ = z - topZ; let localY = y - (stipeHeight - 0.02);
                let t = 1 - (localY / capHeight); // t=0 no centro do topo, t=1 nas bordas
                let a = Math.atan2(localZ, localX); // Ângulo

                // Aplicação de RadNoise e NormNoise
                // Cria as famosas bordas onduladas (wavy caps) de forma generativa
                let ondaNormal = Math.sin(a * freqRadial + seed) * distorcaoNormal * t;
                y += ondaNormal;
                x += Math.cos(a) * ondaNormal;
                z += Math.sin(a) * ondaNormal;

                cPos.setXYZ(i, x, y, z);

                // Coloração generativa: Mais escura nas pontas e com ruído granulado
                let cNoise = Math.random() * 0.1;
                cColor[i*3]   = baseColor.r - cNoise - (t * 0.25);
                cColor[i*3+1] = baseColor.g - cNoise - (t * 0.25);
                cColor[i*3+2] = baseColor.b - cNoise - (t * 0.25);
            }
            capGeo.setAttribute('color', new THREE.BufferAttribute(cColor, 3));

            // Recalcular normais para as sombras assentarem bem nas deformações
            stipeGeo.computeVertexNormals();
            capGeo.computeVertexNormals();

            // Mesclar as partes num único BufferGeometry optimizado
            return BufferGeometryUtils.mergeGeometries([stipeGeo, capGeo], false);
        }

        // GERAR O ATLAS DE ESPÉCIES
        const paletaFXHash = [0xc44545, // Vermelho Bosque (estilo clássico Amanita, mas mais suave)
            0xff8833, // Laranja Mágico (o que tu gostaste, intocado!)
            0xdda140, // Ouro / Mel (amarelo quente orgânico)
            0x8a6b9e, // Ametista / Alfazema (roxo poeirento e místico)
            0x487996, // Azul Ardósia / Lago (um azul sereno, menos elétrico)
            0x6e8c52, // Verde Sálvia / Musgo (mistura-se com a erva, mas destaca-se)
            0x98c9bc  // Menta Bioluminescente (para dar aquele ar de magia noturna)
            ];
        const numEspecies = 6;
        const especiesGeom = [];
        
        for (let i = 0; i < numEspecies; i++) {
            const corMistica = paletaFXHash[Math.floor(Math.random() * paletaFXHash.length)];
            especiesGeom.push(criarCogumeloGenerativo(corMistica));
        }

        // O SEGREDO DO RENDER: Material que lê a VertexColor generativa!
        const material = new THREE.MeshLambertMaterial({ 
            vertexColors: true,  // <--- Lê o ruído que pintámos via código!
            flatShading: true,   // Dá aquele ar estético indie/low poly
            side: THREE.DoubleSide
        });
        
        const countPorEspecie = Math.ceil(totalMushroomsRequested / numEspecies);
        const instancedMeshes = especiesGeom.map(geom => {
            const im = new THREE.InstancedMesh(geom, material, countPorEspecie);
            im.castShadow = false; 
            im.receiveShadow = false;
            return im;
        });

        // ESPALHAR PELO LABIRINTO COM RAYCASTER (Código corrigido e protegido)
        const raycaster = new THREE.Raycaster();
        const downVector = new THREE.Vector3(0, -1, 0);
        
        const alvosRaycaster = [...mazeObjects];
        scene.children.forEach(c => {
            if (c.isMesh && (c.name === 'floor' || (c.geometry && c.geometry.type === 'PlaneGeometry'))) {
                alvosRaycaster.push(c);
            }
        });

        const minX = -45, maxX = 45;
        const minZ = -45, maxZ = 45;
        const alturaOrigem = 20;

        const dummy = new THREE.Object3D();
        let counts = new Array(numEspecies).fill(0);
        const maxTentativas = totalMushroomsRequested * 5; 

        for(let i = 0; i < maxTentativas; i++) {
            const totalGerados = counts.reduce((a,b)=>a+b, 0);
            if (totalGerados >= totalMushroomsRequested) break;

            const rx = minX + Math.random() * (maxX - minX);
            const rz = minZ + Math.random() * (maxZ - minZ);
            
            raycaster.set(new THREE.Vector3(rx, alturaOrigem, rz), downVector);
            const hits = raycaster.intersectObjects(alvosRaycaster, true);

            if (hits.length > 0) {
                let hit = null;
                for (let j = 0; j < hits.length; j++) {
                    if (hits[j].face) {
                        const normalMundo = hits[j].face.normal.clone();
                        if (hits[j].object) {
                            const matrizNormal = new THREE.Matrix3().getNormalMatrix(hits[j].object.matrixWorld);
                            normalMundo.applyMatrix3(matrizNormal).normalize();
                        }
                        if (normalMundo.y > 0.8) {
                            hit = hits[j];
                            break;
                        }
                    }
                }

                if (hit) {
                    const type = Math.floor(Math.random() * numEspecies);
                    if (counts[type] < countPorEspecie) {
                        dummy.position.copy(hit.point);
                        // Rotação e escala variada para maximizar o caos
                        dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
                        dummy.scale.setScalar(0.5 + Math.random() * 1.5);
                        dummy.updateMatrix();

                        instancedMeshes[type].setMatrixAt(counts[type], dummy.matrix);
                        counts[type]++;
                    }
                }
            }
        }

        instancedMeshes.forEach((inst, idx) => {
            inst.count = counts[idx];
            inst.instanceMatrix.needsUpdate = true;
            inst.computeBoundingSphere(); 
            scene.add(inst);
        });

        const totalFinal = counts.reduce((a,b)=>a+b, 0);
        console.log(`[Generative Fungi] Sucesso: Geradas ${numEspecies} espécies únicas e plantados ${totalFinal} espécimes.`);
        resolve();
    });
}
