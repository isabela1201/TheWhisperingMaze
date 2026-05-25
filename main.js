// main.js
// Main entry point: handles game initialization, event listeners, maze model loading, and the render loop

function adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala = 1, isColecionavel = false, idColecionavel = null) {
    const loader = new THREE.GLTFLoader();
    
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(escala);
        
        // Calculate Bounding Box for floor alignment
        model.traverse((child) => {
            if (child.isMesh) child.geometry.computeBoundingBox();
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const alturaCompensada = (posY === 0) ? (size.y / 2) : posY;
        model.position.set(posX, alturaCompensada, posZ);
        model.rotation.y = grausY * (Math.PI / 180);
        
        model.position.y = -0.5;
        
        scene.add(model);
        mazeObjects.push(model);

        // If collectible, create glow ring
        if (isColecionavel) {
            const ringGeo = new THREE.RingGeometry(size.x * 0.6, size.x * 0.8, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x00aaff,          // Soft cyan glow
                emissive: 0x00aaff,
                emissiveIntensity: 2.0,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.set(posX, alturaCompensada + 0.05, posZ);
            
            scene.add(ringMesh);
            
            ringMesh.userData = { id: idColecionavel, baseY: ringMesh.position.y };
            aneisLuminosos.push(ringMesh);
            
            colecionaveis.push({
                id: idColecionavel,
                model: model,
                ring: ringMesh,
                pos: new THREE.Vector3(posX, alturaCompensada, posZ),
                coletado: false
            });
        }

        // Shadows config
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material && child.material.map) {
                    // Limit anisotropy to 4 to save GPU resources
                    child.material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
                }
            }
        });
        
    }, undefined, (error) => console.error(error));
}

function init() {
    initState(); // Initialise THREE-dependent global state (exitPos, playerPos, torchColor)

    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.FOG_COLOR);
    scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, 5, 60);


    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Limit pixel ratio to max 1.25 to prevent performance issues on high-res displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    const textureLoader = new THREE.TextureLoader();
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ roughness: 1.0 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    function loadFloorTex(path, prop) {
        textureLoader.load(path, (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(210, 210);
            // Limit anisotropy to 4 to prevent fill-rate bottlenecks
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
            floorMat[prop] = tex;
            floorMat.needsUpdate = true;
        });
    }

    loadFloorTex('assets/grass/aerial_grass_rock_diff_1k.png', 'map');
    loadFloorTex('assets/grass/aerial_grass_rock_nor_gl_1k.png', 'normalMap');
    loadFloorTex('assets/grass/aerial_grass_rock_rough_1k.png', 'roughnessMap');

    // Modules initialization
    setupLighting();
    setupDayNightCycle(); 
    setupInput();
    createWhispers();     
    createPlayerBody();   
    createFirstPersonTorch();
    
    // Light Pool of 4 PointLights (potato friendly optimization)
    for (let i = 0; i < 4; i++) {
        const pl = new THREE.PointLight(0xff9922, 0, 8, 1.5);
        pl.castShadow = false; // Wall lights do not cast shadows
        scene.add(pl);
        lightPool.push(pl);
    }

    SkyEnvironment.init(scene); 
    loadMazeModel();

    adicionarObjetoFixo('assets/elements/novelo_final.glb', 17.22, 0, -1, 212, 5, true, 0);

    lastTime = clock.getElapsedTime();

    animate();
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        const key = e.code.toLowerCase();
        if (key === 'keyw') KEY.w = true;
        if (key === 'keys') KEY.s = true;
        if (key === 'keya') KEY.a = true;
        if (key === 'keyd') KEY.d = true;
        if (e.shiftKey) KEY.shift = true;
        if (key === 'space') KEY.space = true;
        if (key === 'controlleft' || key === 'controlright') KEY.control = true;

        if (e.code === 'KeyC' && gameStarted && !gameWon) toggleCamera();

        if (e.code === 'KeyV' && gameStarted && !gameWon) {
            flyMode = !flyMode;
            console.log(`Modo de voo: ${flyMode ? 'ATIVADO' : 'DESATIVADO'}`);
        }

        if (e.code === 'Escape' && gameStarted && !gameWon) {
            if (isLocked) document.exitPointerLock();
            else renderer.domElement.requestPointerLock();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.code.toLowerCase();
        if (key === 'keyw') KEY.w = false;
        if (key === 'keys') KEY.s = false;
        if (key === 'keya') KEY.a = false;
        if (key === 'keyd') KEY.d = false;
        if (!e.shiftKey) KEY.shift = false;
        if (key === 'space') KEY.space = false;
        if (key === 'controlleft' || key === 'controlright') KEY.control = false;
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && gameStarted && !gameWon) {
            if (isLocked) {
                document.exitPointerLock();
                paused = true;
            } else {
                renderer.domElement.requestPointerLock();
                paused = false;
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isLocked && gameStarted) {
            yaw -= e.movementX * 0.002;
            pitch -= e.movementY * 0.002;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
        if (gameStarted && !gameWon && !isLocked) paused = true;
        if (isLocked) paused = false;
        updateDebug();
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('overlay').style.display = 'none';
        renderer.domElement.requestPointerLock();
        gameStarted = true;
    });

    document.getElementById('restart-btn').addEventListener('click', () => location.reload());

    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`emoji-slot-${i}`);
        if (slot) {
            slot.addEventListener('click', (e) => {
                if (gameStarted && !gameWon) {
                    reverHistoria(i);
                }
            });
        }
    }

    // Raycast interaction with wall torches
    window.addEventListener('click', (e) => {
        if (isLocked && gameStarted && !gameWon && !paused) {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            
            const intersects = raycaster.intersectObjects(wallTorches, true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && obj.parent && !obj.userData.isWallTorch) {
                    obj = obj.parent;
                }
                
                if (obj && obj.userData.isWallTorch && obj.userData.active) {
                    const dist = playerPos.distanceTo(obj.position);
                    if (dist < 3.5) {
                        if (!hasTorch) {
                            obj.userData.active = false;
                            obj.userData.flame.visible = false;
                            
                            hasTorch = true;
                            torchOn = true;
                            torchTimeRemaining = 60.0;
                            
                            showNotification("Roubaste uma tocha da parede! Agora tens luz 🔥");
                        } else {
                            torchOn = true;
                            torchTimeRemaining = 60.0;
                            
                            showNotification("Reacendeste a tua tocha! +1 Minuto de Luz 🔥");
                        }
                    } else {
                        showNotification("Estás demasiado longe para alcançar a tocha!");
                    }
                }
            }
        }
    });
}

function loadMazeModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(CONFIG.MODEL_PATH, (gltf) => {
        const model = gltf.scene;
        model.position.y = -0.5;

        scene.add(model);

        camera.position.set(-0.8, CONFIG.PLAYER_HEIGHT, 3);
        playerPos.set(-0.8, CONFIG.PLAYER_HEIGHT, 3);

        model.traverse((child) => {
            if (child.isMesh) {
                mazeObjects.push(child);
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.name.toLowerCase().includes('tree') || child.name.toLowerCase().includes('bush')) {
                    vegetation.push(child);
                }
                if (child.name.toLowerCase().includes('door')) {
                    doors.push(child);
                }

                if (child.material) {
                    child.material.roughness = 0.9;
                    child.material.metalness = 0.0;
                    child.material.metalnessMap = null;
                    child.material.envMapIntensity = 0.2;
                    child.material.emissive = new THREE.Color(0x334488);
                    child.material.color = new THREE.Color(0xd0d0d0); 
                    child.material.side = THREE.DoubleSide;
                    child.material.emissiveIntensity = 0.5;
                    
                    child.material.needsUpdate = true;

                    if (child.material.map) {
                        // Limit anisotropy to 4
                        child.material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
                        child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                        child.material.map.generateMipmaps = true;
                    }

                    if (!mazeMaterials.includes(child.material)) {
                        mazeMaterials.push(child.material);
                    }
                }
            }
        });
        
        document.getElementById('loading').style.display = 'none';

        // Spawns wall torches
        createWallTorches();

        // Optional nature spawning (ivy/hera is removed)
        if (typeof espalharErvaGLTF === "function") {
            espalharErvaGLTF(scene, mazeObjects);
        }
        
        if (typeof espalharFlorestaGLTF === "function") {
            espalharFlorestaGLTF(scene, mazeObjects);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (sunLight && sunLight.target && camera) {
        // Update shadow targets (Potato Shadows)
        sunLight.target.position.set(camera.position.x, 0, camera.position.z);
        sunLight.position.set(camera.position.x + 20, 50, camera.position.z + 20);
    }

    if (gameStarted && !gameWon && !paused) {
        const tempo = clock.getElapsedTime();
        const delta = tempo - lastTime;
        lastTime = tempo;

        // 1. Collectible Rings animation
        for (let ring of aneisLuminosos) {
            ring.rotation.z += 0.02;
            ring.position.y = ring.userData.baseY + Math.sin(tempo * 3) * 0.08;
        }

        // 2. Check Collectibles Proximity
        for (let col of colecionaveis) {
            if (!col.coletado) {
                const distancia = playerPos.distanceTo(col.pos);
                if (distancia < 1.8) {
                    col.coletado = true;
                    col.ring.visible = false;
                    abrirPapiroHistoria(col.id); 
                }
            }
        }

        // 3. Movement update
        updateMovement();
        
        // 4. Update particle animations, walk cycle, day-night cycle
        updateAnimations(); 

        // 5. Camera update
        if (cameraMode === 'FPS') {
            camera.position.copy(playerPos);
            camera.rotation.set(pitch, yaw, 0);
        } else {
            const tpsElev = Math.max(0.12, Math.min(0.75, pitch * 0.5 + 0.35));
            const targetCamPos = new THREE.Vector3(
                playerPos.x + Math.sin(yaw) * TPS_DISTANCE,
                playerPos.y + TPS_DISTANCE * Math.sin(tpsElev),
                playerPos.z + Math.cos(yaw) * TPS_DISTANCE
            );

            const eyePos = new THREE.Vector3(playerPos.x, playerPos.y + 0.3, playerPos.z);
            const toCam = new THREE.Vector3().subVectors(targetCamPos, eyePos);
            const toCamDist = toCam.length();
            const toCamDir = toCam.clone().normalize();
            const camRay = new THREE.Raycaster(eyePos, toCamDir, 0.1, toCamDist);
            const camHits = camRay.intersectObjects(mazeObjects, false);

            let safeCamPos;
            if (camHits.length > 0) {
                const safeDist = Math.max(0.25, camHits[0].distance - 0.35);
                safeCamPos = eyePos.clone().addScaledVector(toCamDir, safeDist);
            } else {
                safeCamPos = targetCamPos;
            }

            camera.position.lerp(safeCamPos, 0.15);
            camera.lookAt(playerPos.x, playerPos.y + 0.5, playerPos.z);
        }

        // 6. Win check
        if (playerPos.distanceTo(exitPos) < CONFIG.EXIT_RADIUS) {
            gameWon = true;
            document.exitPointerLock();
            document.getElementById('win-screen').style.display = 'flex';
        }

        // 7. Sync player body
        if (playerBody) {
            playerBody.position.set(playerPos.x, playerPos.y - 1.63, playerPos.z);
            playerBody.rotation.y = yaw + Math.PI;
        }

        // 8. Torch timers, notifications and dynamic lights
        const t_global = clock.getElapsedTime();

        // Torch timer
        if (torchOn) {
            torchTimeRemaining -= delta;
            if (torchTimeRemaining <= 0) {
                torchTimeRemaining = 0;
                torchOn = false;
                if (torch) torch.intensity = 0;
                showNotification("A tua tocha apagou-se! Reacende-a numa tocha da parede. 🕯️");
            }
        }

        // Sunset check
        if (currentPhase === 'Noite' && !hasTorch && !nightNotificationShown) {
            nightNotificationShown = true;
            showNotification("Está a ficar escuro! Aproxima-te de uma tocha na parede e clica nela para a roubares. 🧭");
        }

        // Whimsical torch color based on collected artifacts
        let targetColor = new THREE.Color(0xffb52e);
        if (historiasColetadas[1]) {
            targetColor.setHex(0x55ff66); // Green after sword
        } else if (historiasColetadas[0]) {
            targetColor.setHex(0x00bfff); // Blue after thread
        }
        torchColor.lerp(targetColor, 0.05);

        // Position & animate first person torch
        if (cameraMode === 'FPS') {
            if (fpTorch) {
                fpTorch.visible = hasTorch;
                if (fpTorch.flame) {
                    fpTorch.flame.visible = torchOn;
                    if (torchOn) {
                        fpTorch.flame.material.color.copy(torchColor);
                        fpTorch.flame.material.emissive.copy(torchColor);
                        const flameScale = 1.0 + Math.sin(t_global * 12) * 0.08 + Math.cos(t_global * 23) * 0.04;
                        fpTorch.flame.scale.setScalar(flameScale);
                    }
                }
                
                // Breath/walk bobbing of fp torch
                let bobY = Math.sin(t_global * 2) * 0.005;
                let bobX = Math.cos(t_global * 1) * 0.003;
                if (KEY.w || KEY.s || KEY.a || KEY.d) {
                    const walkSpeed = KEY.shift ? 10 : 6;
                    bobY += Math.sin(t_global * walkSpeed) * 0.012;
                    bobX += Math.cos(t_global * walkSpeed / 2) * 0.01;
                }
                fpTorch.position.set(0.25 + bobX, -0.22 + bobY, -0.4);
            }
        } else {
            if (fpTorch) fpTorch.visible = false;
            if (playerBody && playerBody.torchMesh && playerBody.torchMesh.flame && torchOn) {
                playerBody.torchMesh.flame.material.color.copy(torchColor);
                playerBody.torchMesh.flame.material.emissive.copy(torchColor);
                const flameScale = 1.0 + Math.sin(t_global * 12) * 0.08 + Math.cos(t_global * 23) * 0.04;
                playerBody.torchMesh.flame.scale.setScalar(flameScale);
            }
        }

        // Spotlight torch emission
        if (torch) {
            if (torchOn) {
                torch.intensity = 1.8
                    + Math.sin(t_global * 6.3) * 0.12
                    + Math.sin(t_global * 17.7) * 0.06;
                torch.color.copy(torchColor);

                if (cameraMode === 'FPS') {
                    torch.position.copy(camera.position).add(new THREE.Vector3(0.3, -0.2, 0).applyQuaternion(camera.quaternion));
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    torch.target.position.copy(torch.position).add(forward);
                } else if (playerBody && playerBody.rightHand) {
                    playerBody.rightHand.getWorldPosition(torch.position);
                    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                    torch.target.position.copy(torch.position).add(forward);
                }
            } else {
                torch.intensity = 0;
            }
        }

        // Light pool point light updates (Distance Culling + pulse effect)
        const activeTorches = wallTorches.filter(wt => wt.userData.active);
        activeTorches.forEach(wt => {
            wt.userData.distanceToPlayer = playerPos.distanceTo(wt.userData.lightWorldPos);
        });
        
        activeTorches.sort((a, b) => a.userData.distanceToPlayer - b.userData.distanceToPlayer);
        
        for (let i = 0; i < lightPool.length; i++) {
            const light = lightPool[i];
            // Only enable light if within 12.0m radius (optimized down from 16.0m)
            if (i < activeTorches.length && activeTorches[i].userData.distanceToPlayer < 12.0) {
                const wt = activeTorches[i];
                light.position.copy(wt.userData.lightWorldPos);
                
                const randOffset = wt.userData.id * 1.5;
                const pulse = Math.sin(t_global * 10 + randOffset) * 0.08 + Math.cos(t_global * 17 + randOffset) * 0.04;
                light.intensity = 1.2 + pulse * 1.5;
                light.color.copy(torchColor);
                
                wt.userData.flame.scale.setScalar(wt.userData.baseScale + pulse);
                wt.userData.flame.material.color.copy(torchColor);
                wt.userData.flame.material.emissive.copy(torchColor);
            } else {
                light.intensity = 0;
            }
        }
        
        // Animate remaining distant flames (visual scale only, no active GPU pointlight)
        for (let i = 4; i < activeTorches.length; i++) {
            const wt = activeTorches[i];
            const randOffset = wt.userData.id * 1.5;
            const pulse = Math.sin(t_global * 10 + randOffset) * 0.08 + Math.cos(t_global * 17 + randOffset) * 0.04;
            wt.userData.flame.scale.setScalar(wt.userData.baseScale + pulse);
            wt.userData.flame.material.color.copy(torchColor);
            wt.userData.flame.material.emissive.copy(torchColor);
        }

        // Raycast for crosshair activation
        let lookingAtTorch = false;
        if (isLocked && gameStarted && !gameWon && !paused) {
            const hoverRay = new THREE.Raycaster();
            hoverRay.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = hoverRay.intersectObjects(wallTorches, true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && obj.parent && !obj.userData.isWallTorch) {
                    obj = obj.parent;
                }
                if (obj && obj.userData.isWallTorch && obj.userData.active) {
                    const dist = playerPos.distanceTo(obj.position);
                    if (dist < 3.5) {
                        lookingAtTorch = true;
                    }
                }
            }
        }
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            if (lookingAtTorch) {
                crosshair.classList.add('active');
            } else {
                crosshair.classList.remove('active');
            }
        }

        updateDebug();
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game initialization
init();