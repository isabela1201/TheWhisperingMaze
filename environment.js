// environment.js
// Handles light creation, day-night cycle, wall torches, and optimized nature generation

function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff0f0, 1.0);
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
    scene.add(sunLight.target);
    scene.add(sunLight);

    torch = new THREE.SpotLight(0xfffee0, 0, 18, Math.PI / 7, 0.35, 2);
    scene.add(torch);
    scene.add(torch.target);
    scene.add(camera);
}

function setupDayNightCycle() {
    DAY_PHASES = [
        { // 0 — Dawn
            sunColor: new THREE.Color(0xff9944), sunIntensity: 0.7,
            sunPos: new THREE.Vector3(50, 12, 20),
            ambientColor: new THREE.Color(0xffcc88), ambientIntensity: 0.2,
            hemiSky: new THREE.Color(0xffddaa), hemiGround: new THREE.Color(0x554433),
            fogColor: new THREE.Color(0xffccaa), fogNear: 6, fogFar: 45,
            exposure: 0.7, mazeEmissive: 0.0, whisperMult: 0.8,
        },
        { // 1 — Noon
            sunColor: new THREE.Color(0xfff8f0), sunIntensity: 1.6,
            sunPos: new THREE.Vector3(2, 65, 5),
            ambientColor: new THREE.Color(0xe0f0ff), ambientIntensity: 0.55,
            hemiSky: new THREE.Color(0xbbdeff), hemiGround: new THREE.Color(0x77bb77),
            fogColor: new THREE.Color(0xd0eaff), fogNear: 9, fogFar: 72,
            exposure: 0.9, mazeEmissive: 0.0, whisperMult: 0.5,
        },
        { // 2 — Sunset
            sunColor: new THREE.Color(0xff5522), sunIntensity: 0.6,
            sunPos: new THREE.Vector3(-50, 10, 20),
            ambientColor: new THREE.Color(0xcc7755), ambientIntensity: 0.18,
            hemiSky: new THREE.Color(0xff8866), hemiGround: new THREE.Color(0x442211),
            fogColor: new THREE.Color(0xcc9977), fogNear: 5, fogFar: 38,
            exposure: 0.65, mazeEmissive: 0.06, whisperMult: 1.2,
        },
        { // 3 — Night
            sunColor: new THREE.Color(0x334488), sunIntensity: 0.12,
            sunPos: new THREE.Vector3(5, 35, -30),
            ambientColor: new THREE.Color(0x0a1530), ambientIntensity: 0.12,
            hemiSky: new THREE.Color(0x0a1530), hemiGround: new THREE.Color(0x000810),
            fogColor: new THREE.Color(0x05101a), fogNear: 3, fogFar: 20,
            exposure: 0.45, mazeEmissive: 0.18, whisperMult: 2.0,
        },
    ];
}

function updateDayNight(t) {
    if (!DAY_PHASES || !sunLight) return;
    const n = (t % DAY_CYCLE_DURATION) / DAY_CYCLE_DURATION; // 0..1
    const f = n * DAY_PHASES.length;
    const i = Math.floor(f) % DAY_PHASES.length;
    const j = (i + 1) % DAY_PHASES.length;
    const lf = f - Math.floor(f);                              // 0..1 segment fraction
    const A = DAY_PHASES[i], B = DAY_PHASES[j];
    const ls = (a, b) => a + (b - a) * lf;                    // LERP helper

    currentPhase = DAY_PHASE_NAMES[i];

    // Sun / Moon color, intensity, and direction
    sunLight.color.copy(A.sunColor).lerp(B.sunColor, lf);
    sunLight.intensity = ls(A.sunIntensity, B.sunIntensity);
    sunLight.position.lerpVectors(A.sunPos, B.sunPos, lf);

    // Ambient light
    ambientLight.color.copy(A.ambientColor).lerp(B.ambientColor, lf);
    ambientLight.intensity = ls(A.ambientIntensity, B.ambientIntensity);

    // Hemisphere light
    hemiLight.color.copy(A.hemiSky).lerp(B.hemiSky, lf);
    hemiLight.groundColor.copy(A.hemiGround).lerp(B.hemiGround, lf);

    // Fog + sky background color
    scene.fog.color.copy(A.fogColor).lerp(B.fogColor, lf);
    scene.fog.near = ls(A.fogNear, B.fogNear);
    scene.fog.far = ls(A.fogFar, B.fogFar);
    scene.background.copy(A.fogColor).lerp(B.fogColor, lf);

    // Exposure
    renderer.toneMappingExposure = ls(A.exposure, B.exposure);

    // Emissive intensity of maze materials
    const emissive = ls(A.mazeEmissive, B.mazeEmissive);
    mazeMaterials.forEach(mat => { mat.emissiveIntensity = emissive; });

    // Fireflies intensity multiplier
    whisperBrightnessMult = ls(A.whisperMult, B.whisperMult);

    // Skybox environment updates
    if (typeof SkyEnvironment !== 'undefined' && typeof SkyEnvironment.update === 'function') {
        SkyEnvironment.update(n, sunLight.position);
    }
}

function buildTorchMesh(position, normal, index) {
    const group = new THREE.Group();
    group.position.copy(position);
    
    // Rotate to point away from wall
    group.lookAt(position.clone().add(normal));
    
    // Wall bracket support
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.8, flatShading: true });
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 5), bracketMat);
    bracket.rotation.x = Math.PI / 2;
    bracket.position.z = -0.05;
    group.add(bracket);
    
    // Wood handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.22, 5), handleMat);
    handle.position.set(0, 0.04, -0.01);
    handle.rotation.x = -Math.PI / 8; // Tilted slightly
    group.add(handle);
    
    // Metal cup
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8, flatShading: true });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.05, 5), cupMat);
    cup.position.set(0, 0.13, 0.025);
    cup.rotation.x = -Math.PI / 8;
    group.add(cup);
    
    // Flame
    const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff5500,
        emissiveIntensity: 2.0,
        flatShading: true
    });
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), flameMat);
    flame.position.set(0, 0.18, 0.045);
    group.add(flame);
    
    group.userData = {
        isWallTorch: true,
        active: true,
        id: index,
        flame: flame,
        baseScale: 1.0
    };
    
    return group;
}

function createWallTorches() {
    const mazeBox = new THREE.Box3();
    mazeObjects.forEach(obj => {
        if (obj.isInstancedMesh) return;
        if (obj.name.toLowerCase().includes('tree') || obj.name.toLowerCase().includes('bush') || obj.name.toLowerCase().includes('door')) return;
        try {
            const b = new THREE.Box3().setFromObject(obj);
            if (!b.isEmpty() && isFinite(b.min.x) && isFinite(b.max.x)) mazeBox.union(b);
        } catch(e) {}
    });

    if (mazeBox.isEmpty()) {
        mazeBox.set(new THREE.Vector3(-25, -1, -25), new THREE.Vector3(25, 5, 25));
    }
    
    const minX = mazeBox.min.x;
    const maxX = mazeBox.max.x;
    const minZ = mazeBox.min.z;
    const maxZ = mazeBox.max.z;

    // Scan with a gridSpacing of 4.5 to find wall surfaces throughout all corridors
    const gridSpacing = 4.5;
    const raycaster = new THREE.Raycaster();
    const scanHeight = 1.0;
    
    const directions = [
        { dir: new THREE.Vector3(0, 0, 1) },   // North
        { dir: new THREE.Vector3(0, 0, -1) },  // South
        { dir: new THREE.Vector3(1, 0, 0) },   // East
        { dir: new THREE.Vector3(-1, 0, 0) },  // West
    ];

    let count = 0;
    for (let x = minX + 1.5; x <= maxX - 1.5; x += gridSpacing) {
        for (let z = minZ + 1.5; z <= maxZ - 1.5; z += gridSpacing) {
            const startPt = new THREE.Vector3(x, scanHeight, z);
            
            for (let d of directions) {
                raycaster.set(startPt, d.dir);
                const intersects = raycaster.intersectObjects(mazeObjects, true);
                
                let wallHit = null;
                for (let hit of intersects) {
                    const obj = hit.object;
                    const name = obj.name.toLowerCase();
                    if (!obj.isInstancedMesh && !name.includes('tree') && !name.includes('bush') && !name.includes('door') && !name.includes('grass')) {
                        wallHit = hit;
                        break;
                    }
                }
                
                // Scan up to 2.5m distance to find local corridor walls
                if (wallHit && wallHit.distance > 0.3 && wallHit.distance < 2.5) {
                    const torchPos = wallHit.point.clone();
                    
                    const normalWorld = wallHit.face.normal.clone();
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(wallHit.object.matrixWorld);
                    normalWorld.applyMatrix3(normalMatrix).normalize();
                    
                    // Only place on vertical/wall faces
                    if (Math.abs(normalWorld.y) < 0.3) {
                        // Ensure the normal is pointing back towards the starting scan point
                        // (meaning we hit a front-facing wall face from the corridor, not a backface)
                        if (normalWorld.dot(d.dir) < 0) {
                            torchPos.addScaledVector(normalWorld, 0.05);
                            
                            let tooClose = false;
                            for (let existing of wallTorches) {
                                if (existing.position.distanceTo(torchPos) < 5.0) {
                                    tooClose = true;
                                    break;
                                }
                            }
                            
                            if (!tooClose) {
                                const torchGroup = buildTorchMesh(torchPos, normalWorld, count++);
                                scene.add(torchGroup);
                                
                                // Force absolute matrix calculations to find the flame position
                                torchGroup.updateMatrixWorld(true);
                                const localFlamePos = new THREE.Vector3(0, 0.18, 0.045);
                                torchGroup.userData.lightWorldPos = localFlamePos.applyMatrix4(torchGroup.matrixWorld);
                                
                                wallTorches.push(torchGroup);
                            }
                        }
                    }
                }
            }
        }
    }
    console.log(`[Tochas] ${wallTorches.length} tochas criadas no labirinto.`);
}


function espalharErvaGLTF(scene, mazeObjects) {
    console.log("A carregar asset da erva...");

    const loader = new THREE.GLTFLoader();
    loader.load('assets/grass/scene.gltf', (gltf) => {
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

        const QUANTIDADE = 25; // Optimized down from 50
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
        scene.children.forEach(c => {
            if (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry') {
                alvosRaycaster.push(c);
            }
        });

        scene.updateMatrixWorld(true);
        const boundingBox = new THREE.Box3();
        mazeObjects.forEach(obj => {
            const tempBox = new THREE.Box3().setFromObject(obj);
            boundingBox.union(tempBox);
        });

        if (boundingBox.isEmpty() || !isFinite(boundingBox.min.x)) {
            boundingBox.min.set(-60, 0, -60);
            boundingBox.max.set(60, 20, 60);
        }

        const minX = boundingBox.min.x; const maxX = boundingBox.max.x;
        const minZ = boundingBox.min.z; const maxZ = boundingBox.max.z;
        const alturaOrigem = isFinite(boundingBox.max.y) ? boundingBox.max.y + 10 : 20;

        const maxTentativas = QUANTIDADE * 10; 
        for (let i = 0; i < maxTentativas; i++) {
            if (contagem >= QUANTIDADE) break;

            const rx = minX + Math.random() * (maxX - minX);
            const rz = minZ + Math.random() * (maxZ - minZ);
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
        });

        console.log(`[Erva GLTF] Foram espalhados ${contagem} tufos com sucesso.`);
    }, undefined, (error) => {
        console.error("Erro a carregar a erva GLTF:", error);
    });
}

function espalharFlorestaGLTF(scene, mazeObjects) {
    console.log("A carregar asset da floresta...");

    const loader = new THREE.GLTFLoader();
    loader.load('assets/grass/various_forest_assets_pack.glb', (gltf) => {
        const rootNode = gltf.scene.getObjectByName('GLTF_SceneRootNode');
        if (!rootNode) {
            console.error("Nó raiz da floresta não encontrado!");
            return;
        }

        const tiposArvore = [];
        const tiposRocha = [];
        const tiposArbusto = [];

        rootNode.children.forEach(assetNode => {
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

        // Reduced counts for optimization (VERY potato friendly)
        const MAX_ARVORES_TOTAIS = 180; // Down from 600
        const MAX_ROCHAS_TOTAIS = 40;   // Down from 150
        const MAX_ARBUSTOS_TOTAIS = 40; // Down from 150

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
        scene.children.forEach(c => {
            if (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry') {
                alvosRaycaster.push(c);
            }
        });

        scene.updateMatrixWorld(true);
        const mazeBox = new THREE.Box3();
        mazeObjects.forEach(obj => {
            const tempBox = new THREE.Box3().setFromObject(obj);
            mazeBox.union(tempBox);
        });

        if (mazeBox.isEmpty() || !isFinite(mazeBox.min.x)) {
            mazeBox.min.set(-60, 0, -60);
            mazeBox.max.set(60, 20, 60);
        }

        const raioLabirinto = Math.max(Math.abs(mazeBox.min.x), Math.abs(mazeBox.max.x), Math.abs(mazeBox.min.z), Math.abs(mazeBox.max.z)) + 5;
        const raioFlorestaExterior = raioLabirinto + 60; 
        const alturaOrigem = isFinite(mazeBox.max.y) ? mazeBox.max.y + 10 : 30;

        let totalArvoresIn = 0;
        const posArvores = []; 

        const TENTATIVAS = 2500; // Reduced from 6000 since we have fewer trees to place
        
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
                            break;
                        }
                    }
                }

                if (hit) {
                    const distCentro = Math.sqrt(rx*rx + rz*rz);
                    const isInside = distCentro < raioLabirinto;

                    let targetCategoria = null;

                    if (isInside) {
                        // Inside maze
                        const dirLado = new THREE.Vector3(Math.cos(Math.random()*Math.PI*2), 0, Math.sin(Math.random()*Math.PI*2));
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
                        // Outside maze (Forest)
                        if (Math.random() < 0.15) { 
                            targetCategoria = instArvores;
                        } else if (Math.random() < 0.05) {
                            targetCategoria = instRochas; 
                        } else if (Math.random() < 0.05) {
                            targetCategoria = instArbustos;
                        }
                    }

                    if (targetCategoria === instArvores) {
                        let overlap = false;
                        for(let j = 0; j < posArvores.length; j++) {
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
                            dummy.scale.setScalar(1.0 + (Math.random()-0.5)*variacao);
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

        const cleanInst = (categoria, addCollision) => {
            categoria.forEach(t => {
                t.instancedMeshes.forEach(im => {
                    im.count = t.count;
                    im.instanceMatrix.needsUpdate = true;
                    if (addCollision) {
                        mazeObjects.push(im);
                    }
                });
            });
        };
        cleanInst(instArvores, true); 
        cleanInst(instRochas, true);
        cleanInst(instArbustos, false);

        console.log("Floresta gerada com sucesso!");
    }, undefined, (err) => console.error(err));
}

function updateAnimations() {
    const t = clock.getElapsedTime();
    const delta = t - whisperPrevTime;
    whisperPrevTime = t;

    if (typeof updateWhispers === 'function') updateWhispers(t, delta);
    updateDayNight(t);
    if (typeof updatePlayerAnimation === 'function') updatePlayerAnimation(delta);

    // Vegetação (Abanar com vento)
    vegetation.forEach(plant => {
        plant.rotation.z = Math.sin(t + plant.position.x) * 0.03;
    });
}
