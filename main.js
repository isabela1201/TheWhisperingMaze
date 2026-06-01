// main.js
// Main entry point: handles game initialization, event listeners, maze model loading, and the render loop

import * as THREE from 'three';
import { ColorManagement } from 'three';
import { getGLTFLoader } from './loaderHelper.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Add the extension functions to Three.js prototype for ultra-fast raycasting
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ── Disable automatic color management to preserve original r128 visual appearance ──
// Three.js r152+ enables this by default which changes how hex colors are interpreted
// (sRGB → linear conversion). Disabling keeps fog, lighting, and emissive colors
// matching the original look built with r128.
ColorManagement.enabled = false;

import * as state from './state.js';
import { S, initState } from './state.js';
import { CONFIG } from './config.js';

import {
    abrirPapiroHistoria, fecharPapiro, reverHistoria,
    showNotification,
    avancarPapiro
} from './ui.js';

import { SkyEnvironment } from './sky.js';
import { createWhispers } from './particles.js';
import { createPlayerBody, createFirstPersonTorch, toggleCamera, updateMovement, updatePlayerAnimation } from './player.js';
import {
    setupLighting, setupDayNightCycle, updateAnimations,
    createWallTorches, espalharErvaGLTF, espalharFlorestaGLTF, espalharCogumelosOptimizado
} from './environment.js';
import { popularCena, verificarColecionaveisEspeciais, verificarProximidade, fecharPopupCuriosidade, abrirPopupCuriosidade } from './objects.js';
import { createExitDoor } from './door.js';

// ── Expose UI functions to global scope for HTML inline onclick handlers ──────
window._game = {
    fecharPapiro,
    fecharPopupCuriosidade,
    avancarPapiro,
};

function getExpectedSize(stage) {
    switch (stage) {
        case 'floor_diff': return 192994;
        case 'floor_nor': return 214576;
        case 'floor_rough': return 112188;
        case 'maze': return 6662300;
        case 'grass': return 164054;
        case 'forest': return 40462192;
        default: return 1000000;
    }
}

// ── Loading progress tracking ────────────────────────────────────────────────
const loadingStages = {
    floor_diff: { weight: 10, percent: 0 },
    floor_nor: { weight: 10, percent: 0 },
    floor_rough: { weight: 5, percent: 0 },
    maze: { weight: 20, percent: 0 },
    grass: { weight: 15, percent: 0 },
    forest: { weight: 40, percent: 0 }
};

window.updateLoadingProgress = function (stage, percent) {
    if (loadingStages[stage]) {
        loadingStages[stage].percent = Math.max(loadingStages[stage].percent, percent);
    }

    let totalProgress = 0;
    let totalWeight = 0;
    for (const key in loadingStages) {
        totalProgress += (loadingStages[key].percent / 100) * loadingStages[key].weight;
        totalWeight += loadingStages[key].weight;
    }

    const finalPercent = Math.min(Math.round((totalProgress / totalWeight) * 100), 100);

    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.width = finalPercent + '%';
    }

    const subtitle = document.getElementById('loading-subtitle');
    if (subtitle) {
        let message = 'A carregar recursos...';
        if (finalPercent < 25) {
            message = 'A carregar texturas e estruturas...';
        } else if (finalPercent < 45) {
            message = 'A carregar o labirinto...';
        } else if (finalPercent < 60) {
            message = 'A gerar a vegetação...';
        } else if (finalPercent < 90) {
            message = 'A semear a floresta...';
        } else if (finalPercent < 100) {
            message = 'A finalizar a geração do mundo...';
        } else {
            message = 'Concluído!';
        }
        subtitle.textContent = `${message} (${finalPercent}%)`;
    }
};

// ─────────────────────────────────────────────────────────────────────────────

function init() {
    initState(); // Initialise THREE-dependent global state (exitPos, playerPos, torchColor)

    S.setScene(new THREE.Scene());
    state.scene.background = new THREE.Color(CONFIG.FOG_COLOR);
    state.scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, 5, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';
    S.setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Limit pixel ratio to max 1.25 to prevent performance issues on high-res displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    S.setRenderer(renderer);

    initAudio();

    // Use THREE.Timer to fix the deprecated THREE.Clock warning in r184
    let clockOrTimer;
    if (THREE.Timer) {
        clockOrTimer = new THREE.Timer();
        clockOrTimer.connect(document);
        clockOrTimer.getElapsedTime = function () { return this.getElapsed(); };
    } else {
        clockOrTimer = new THREE.Clock();
    }
    S.setClock(clockOrTimer);

    const textureLoader = new THREE.TextureLoader();
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ roughness: 1.0, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.name = 'floor'; // Explicitly named for robust selection in environment.js raycasting
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    state.scene.add(floorMesh);

    function loadFloorTex(path, prop) {
        const stage = prop === 'map' ? 'floor_diff' : (prop === 'normalMap' ? 'floor_nor' : 'floor_rough');
        textureLoader.load(
            path,
            (tex) => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(210, 210);
                // Limit anisotropy to 4 to prevent fill-rate bottlenecks
                tex.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
                floorMat[prop] = tex;
                floorMat.needsUpdate = true;
                if (renderer) {
                    renderer.initTexture(tex);
                }
                window.updateLoadingProgress(stage, 100);
            },
            (xhr) => {
                const total = xhr.total || getExpectedSize(stage);
                const p = Math.min((xhr.loaded / total) * 100, 99);
                window.updateLoadingProgress(stage, p);
            },
            (err) => {
                console.error(`Erro a carregar textura ${path}:`, err);
                window.updateLoadingProgress(stage, 100);
            }
        );
    }

    loadFloorTex('assets/grass/aerial_grass_rock_diff_1k.webp', 'map');
    loadFloorTex('assets/grass/aerial_grass_rock_nor_gl_1k.webp', 'normalMap');
    loadFloorTex('assets/grass/aerial_grass_rock_rough_1k.webp', 'roughnessMap');

    // Modules initialization
    setupLighting();
    setupDayNightCycle();
    setupInput();
    createWhispers();
    createPlayerBody();
    createFirstPersonTorch();

    // No global light pool needed as lights are embedded in wall torch groups.
    // However, we initialize lightPool to avoid reference errors elsewhere.
    S.setLightPool([]);

    SkyEnvironment.init(state.scene);
    loadMazeModel();

    // ── Populate scene with interactive objects (objects.js) ─────────────
    // novelo, espada, estatua_girl, minotauro, golfinho, amfora, fonte are all
    // placed inside popularCena() in objects.js.
    popularCena();

    // ── Create the exit door at the outermost maze opening (door.js) ─────
    createExitDoor(1.5, 0, -38.35, 0, 1.5);

    S.setLastTime(state.clock.getElapsedTime());

    animate();
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        const key = e.code.toLowerCase();
        if (key === 'keyw') S.setKey('w', true);
        if (key === 'keys') S.setKey('s', true);
        if (key === 'keya') S.setKey('a', true);
        if (key === 'keyd') S.setKey('d', true);
        if (e.shiftKey) S.setKey('shift', true);
        if (key === 'space') S.setKey('space', true);
        if (key === 'controlleft' || key === 'controlright') S.setKey('control', true);

        if (e.code === 'KeyC' && state.gameStarted && !state.gameWon) toggleCamera();

        if (e.code === 'KeyF' && state.gameStarted && !state.gameWon) {
            if (state.hasAcquiredTorch) {
                if (state.hasTorch) {
                    S.setHasTorch(false);
                    S.setTorchOn(false);
                    showNotification("Guardaste a tocha.");
                } else {
                    S.setHasTorch(true);
                    S.setTorchOn(false); // ATTENTION: appears without the flame!
                    showNotification("Equipaste a tocha (apagada). Acende-a numa tocha da parede.");
                }
            } else {
                showNotification("Ainda não tens nenhuma tocha! Rouba uma da parede primeiro.");
            }
        }

        if (e.code === 'Escape' && state.gameStarted && !state.gameWon) {
            if (state.isLocked) document.exitPointerLock();
            else state.renderer.domElement.requestPointerLock();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.code.toLowerCase();
        if (key === 'keyw') S.setKey('w', false);
        if (key === 'keys') S.setKey('s', false);
        if (key === 'keya') S.setKey('a', false);
        if (key === 'keyd') S.setKey('d', false);
        if (!e.shiftKey) S.setKey('shift', false);
        if (key === 'space') S.setKey('space', false);
        if (key === 'controlleft' || key === 'controlright') S.setKey('control', false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && state.gameStarted && !state.gameWon) {
            if (state.isLocked) {
                document.exitPointerLock();
                S.setPaused(true);
            } else {
                state.renderer.domElement.requestPointerLock();
                S.setPaused(false);
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (state.isLocked && state.gameStarted) {
            S.setYaw(state.yaw - e.movementX * 0.002);
            S.setPitch(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.pitch - e.movementY * 0.002)));
        }
    });

    document.addEventListener('pointerlockchange', () => {
        S.setIsLocked(document.pointerLockElement === state.renderer.domElement);
        if (state.gameStarted && !state.gameWon && !state.isLocked) S.setPaused(true);
        if (state.isLocked) S.setPaused(false);
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('overlay').style.display = 'none';
        state.renderer.domElement.requestPointerLock();
        S.setGameStarted(true);
        
        // Ativar o áudio do browser e tocar o ambiente
        if (state.audioListener && state.audioListener.context.state === 'suspended') {
            state.audioListener.context.resume();
        }
        if (state.sounds.ambient && !state.sounds.ambient.isPlaying) {
            state.sounds.ambient.play();
        }
    });

    document.getElementById('restart-btn').addEventListener('click', () => location.reload());

    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`emoji-slot-${i}`);
        if (slot) {
            slot.addEventListener('click', () => {
                if (state.gameStarted && !state.gameWon) {
                    reverHistoria(i);
                }
            });
        }
    }

    // Raycast interaction with wall torches
    window.addEventListener('click', () => {
        if (state.isLocked && state.gameStarted && !state.gameWon && !state.paused) {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);

            const intersects = raycaster.intersectObjects(state.wallTorches, true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && obj.parent && !obj.userData.isWallTorch) {
                    obj = obj.parent;
                }

                if (obj && obj.userData.isWallTorch && obj.userData.active) {
                    const dist = state.playerPos.distanceTo(obj.position);
                    if (dist < 3.5) {
                        if (!state.hasTorch) {
                            // Guarda se é a primeira vez antes de alterar o estado global
                            const primeiraVez = !state.hasAcquiredTorch;

                            obj.userData.active = false;
                            obj.userData.flame.visible = false;
                            if (obj.spotLight) {
                                obj.spotLight.intensity = 0;
                                obj.spotLight.visible = false;
                                obj.spotLight.castShadow = false;
                            }

                            S.setHasTorch(true);
                            S.setHasAcquiredTorch(true);
                            S.setTorchOn(true);
                            S.setTorchTimeRemaining(60.0);

                            // Se for a primeira vez, abre o pop-up com a Lore. Caso contrário, mostra apenas a notificação normal.
                            if (primeiraVez) {
                                abrirPopupCuriosidade({ key: 'tocha' });
                            } else {
                                showNotification("Roubaste uma tocha da parede! Agora tens luz 🔥");
                            }
                        } else {
                            S.setTorchOn(true);
                            S.setTorchTimeRemaining(60.0);

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
    const loader = getGLTFLoader();
    loader.load(
        CONFIG.MODEL_PATH,
        (gltf) => {
            window.updateLoadingProgress('maze', 99);
            setTimeout(() => {
                window.updateLoadingProgress('maze', 100);
                const model = gltf.scene;
                model.position.y = -0.5;

                state.scene.add(model);

                state.camera.position.set(-0.8, CONFIG.PLAYER_HEIGHT, 3);
                state.playerPos.set(-0.8, CONFIG.PLAYER_HEIGHT, 3);

                model.traverse((child) => {
                    if (child.isMesh) {
                        // Precompute BVH for fast raycasting
                        if (child.geometry && child.geometry.computeBoundsTree) {
                            child.geometry.computeBoundsTree();
                        }

                        state.mazeObjects.push(child);
                        child.castShadow = true;
                        child.receiveShadow = true;

                        if (child.name.toLowerCase().includes('tree') || child.name.toLowerCase().includes('bush')) {
                            state.vegetation.push(child);
                        }
                        if (child.name.toLowerCase().includes('door')) {
                            state.doors.push(child);
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
                                child.material.map.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
                                child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                                child.material.map.generateMipmaps = true;
                            }

                            if (!state.mazeMaterials.includes(child.material)) {
                                state.mazeMaterials.push(child.material);
                            }
                        }
                    }
                });

                // Spawns wall torches (fast, done synchronously)
                createWallTorches();

                // Nature generation is heavy (async GLB loads + raycasting).
                // We load them sequentially to avoid concurrent CPU & network bottlenecks.
                console.time('ErvaTime');
                espalharErvaGLTF(state.scene, state.mazeObjects)
                    .then(() => {
                        console.timeEnd('ErvaTime');
                        console.time('FlorestaTime');
                        return espalharFlorestaGLTF(state.scene, state.mazeObjects);
                    })
                    .then(() => {
                        console.timeEnd('FlorestaTime');
                        console.time('CogumelosTime');
                        // Chama a nova função aqui!
                        return espalharCogumelosOptimizado(state.scene, state.mazeObjects, 400); 
                    })
                    .then(() => {
                        console.timeEnd('CogumelosTime');
                        console.log("[Loading] Todo o ambiente carregado. A aguardar atualização do DOM...");
                        return new Promise(resolve => setTimeout(resolve, 80));
                    })
                    .then(() => {
                        // console.log("[Loading] A compilar materiais e shaders na GPU...");
                        // console.time('CompileTime');
                        // if (state.renderer && state.scene && state.camera) {
                        //     state.renderer.compile(state.scene, state.camera);
                        // }
                        // console.timeEnd('CompileTime');
                        console.log("[Loading] Materiais (auto) compilados. A iniciar o jogo...");
                        setTimeout(() => {
                            document.getElementById('loading').style.display = 'none';
                        }, 500);
                        console.timeEnd('loadMazeModel');
                    })
                    .catch((err) => {
                        console.error("[Loading] Erro a carregar o ambiente:", err);
                        // Fallback: hide loading screen anyway so the game is not stuck
                        setTimeout(() => {
                            document.getElementById('loading').style.display = 'none';
                        }, 500);
                    });
            }, 50);
        },
        (xhr) => {
            const total = xhr.total || 6662300;
            const p = Math.min((xhr.loaded / total) * 100, 99);
            window.updateLoadingProgress('maze', p);
        },
        (error) => {
            console.error("Erro a carregar o labirinto:", error);
            window.updateLoadingProgress('maze', 100);
            // Hide loading screen as fallback if maze fails completely
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 500);
        }
    );
}

function initAudio() {
    // O AudioListener "ouve" os sons e fica colado à câmara
    const listener = new THREE.AudioListener();
    state.camera.add(listener);
    S.setAudioListener(listener);

    const audioLoader = new THREE.AudioLoader();

    // 1. Som Ambiente (Loop infinito)
    const ambientSound = new THREE.Audio(listener);
    audioLoader.load('assets/sounds/ambiente.mp3', (buffer) => {
        ambientSound.setBuffer(buffer);
        ambientSound.setLoop(true);
        ambientSound.setVolume(0.3); // Volume mais baixo para não chatear
    });
    state.sounds.ambient = ambientSound;

    // 2. Som de Colecionável
    const collectSound = new THREE.Audio(listener);
    audioLoader.load('assets/sounds/collect.mp3', (buffer) => {
        collectSound.setBuffer(buffer);
        collectSound.setVolume(0.8);
    });
    state.sounds.collect = collectSound;
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    // Update the Timer/Clock each frame
    if (state.clock && typeof state.clock.update === 'function') {
        state.clock.update(timestamp);
    }

    if (state.sunLight && state.sunLight.target && state.camera) {
        // Update shadow targets (Potato Shadows)
        state.sunLight.target.position.set(state.camera.position.x, 0, state.camera.position.z);
        state.sunLight.position.set(state.camera.position.x + 20, 50, state.camera.position.z + 20);
    }

    if (state.gameStarted && !state.gameWon && !state.paused) {
        const tempo = state.clock.getElapsedTime();
        const delta = tempo - state.lastTime;
        S.setLastTime(tempo);

        // 1. Collectible Rings animation
        for (let ring of state.aneisLuminosos) {
            ring.rotation.z += 0.02;
            ring.position.y = ring.userData.baseY + Math.sin(tempo * 3) * 0.08;
        }

        // 1b. Animate instruction whisp
        if (state.papiroWhisp) {
            state.papiroWhisp.position.y = 0.8 + Math.sin(tempo * 2.0) * 0.12;
            state.papiroWhisp.rotation.y += 0.03;
        }

        // 1c. Instruction whisp proximity check
        if (state.papiroWhisp && !state.instructionsTriggered) {
            const dist = state.playerPos.distanceTo(state.papiroWhisp.position);
            if (dist < 2.0) {
                S.setInstructionsTriggered(true);
                abrirPapiroHistoria('instructions');
            }
        }

        // 2. Check Collectibles Proximity (novelo system)
        for (let col of state.colecionaveis) {
            if (!col.coletado) {
                const distancia = state.playerPos.distanceTo(col.pos);
                if (distancia < 1.8) {
                    col.coletado = true;
                    col.ring.visible = false;
                    
                    // --- TOCA O SOM DE CAPTURA ---
                    if (state.sounds.collect) {
                        if (state.sounds.collect.isPlaying) state.sounds.collect.stop();
                        state.sounds.collect.play();
                    }
                    
                    abrirPapiroHistoria(col.id);
                }
            }
        }

        // 2b. Check special collectibles (espada, estatua_girl) — objects.js
        verificarColecionaveisEspeciais();

        // 2c. Proximity popups for non-collectible objects — objects.js
        verificarProximidade();

        // 3. Movement update
        updateMovement();

        // 4. Update particle animations, walk cycle, day-night cycle
        updateAnimations();

        // 5. Camera update
        if (state.cameraMode === 'FPS') {
            state.camera.position.copy(state.playerPos);
            state.camera.rotation.set(state.pitch, state.yaw, 0);
        } else {
            const tpsElev = Math.max(0.12, Math.min(0.75, state.pitch * 0.5 + 0.35));
            const targetCamPos = new THREE.Vector3(
                state.playerPos.x + Math.sin(state.yaw) * state.TPS_DISTANCE,
                state.playerPos.y + state.TPS_DISTANCE * Math.sin(tpsElev),
                state.playerPos.z + Math.cos(state.yaw) * state.TPS_DISTANCE
            );

            const eyePos = new THREE.Vector3(state.playerPos.x, state.playerPos.y + 0.3, state.playerPos.z);
            const toCam = new THREE.Vector3().subVectors(targetCamPos, eyePos);
            const toCamDist = toCam.length();
            const toCamDir = toCam.clone().normalize();
            const camRay = new THREE.Raycaster(eyePos, toCamDir, 0.1, toCamDist);
            const camHits = camRay.intersectObjects(state.mazeObjects, false);

            let safeCamPos;
            if (camHits.length > 0) {
                const safeDist = Math.max(0.25, camHits[0].distance - 0.35);
                safeCamPos = eyePos.clone().addScaledVector(toCamDir, safeDist);
            } else {
                safeCamPos = targetCamPos;
            }

            state.camera.position.lerp(safeCamPos, 0.15);
            state.camera.lookAt(state.playerPos.x, state.playerPos.y + 0.5, state.playerPos.z);
        }

        // 6. Win check
        // Calculamos a distância apenas nos eixos X e Z (2D) para ignorar a altura (Y) do jogador
        const dx = state.playerPos.x - state.exitPos.x;
        const dz = state.playerPos.z - state.exitPos.z;
        const distanciaSaida = Math.sqrt(dx * dx + dz * dz);

        if (distanciaSaida < CONFIG.EXIT_RADIUS) {
            S.setGameWon(true);
            document.exitPointerLock();
            
            // Display elapsed time on win screen
            const totalSecs = Math.floor(state.clock.getElapsedTime());
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            const winTimeEl = document.getElementById('win-time');
            if (winTimeEl) {
                winTimeEl.innerHTML = `⏱️ Tempo: <strong>${mins}m ${secs.toString().padStart(2,'0')}s</strong>`;
            }
            document.getElementById('win-screen').style.display = 'flex';
        }

        // 7. Sync player body
        if (state.playerBody) {
            state.playerBody.position.set(state.playerPos.x, state.playerPos.y - 1.63, state.playerPos.z);
            state.playerBody.rotation.y = state.yaw + Math.PI;
        }

        // 8. Torch timers, notifications and dynamic lights
        const t_global = state.clock.getElapsedTime();

        // Torch timer
        if (state.torchOn) {
            S.setTorchTimeRemaining(state.torchTimeRemaining - delta);
            if (state.torchTimeRemaining <= 0) {
                S.setTorchTimeRemaining(0);
                S.setTorchOn(false);
                if (state.torch) state.torch.intensity = 0;
                showNotification("A tua tocha apagou-se! Reacende-a numa tocha da parede. 🕯️");
            }
        }

        // ── Torch HUD bar update ────────────────────────────────────────────
        {
            const torchHud = document.getElementById('torch-hud');
            const torchBar = document.getElementById('torch-bar');
            if (torchHud && torchBar) {
                if (state.hasTorch) {
                    torchHud.classList.add('active');
                    const pct = Math.max(0, (state.torchTimeRemaining / 60.0) * 100);
                    torchBar.style.width = pct + '%';
                    if (pct <= 20) {
                        torchHud.classList.add('low');
                    } else {
                        torchHud.classList.remove('low');
                    }
                } else {
                    torchHud.classList.remove('active');
                    torchHud.classList.remove('low');
                    torchBar.style.width = '100%';
                }
            }
        }


        if (state.currentPhase === 'Noite' && !state.hasTorch && !state.nightNotificationShown) {
            S.setNightNotificationShown(true);
            showNotification("Está a ficar escuro! Aproxima-te de uma tocha na parede e clica nela para a roubares. 🧭");
        }

        // Whimsical torch color based on collected artifacts
        let targetColor = new THREE.Color(0xffb52e);
        if (state.historiasColetadas[2]) {
            targetColor.setHex(0xd154ff); // Purple after statue
        } else if (state.historiasColetadas[1]) {
            targetColor.setHex(0x55ff66); // Green after sword
        } else if (state.historiasColetadas[0]) {
            targetColor.setHex(0x00bfff); // Blue after thread
        }
        state.torchColor.lerp(targetColor, 0.05);

        // Position & animate first person torch
        if (state.cameraMode === 'FPS') {
            if (state.fpTorch) {
                state.fpTorch.visible = state.hasTorch;
                if (state.fpTorch.flame) {
                    state.fpTorch.flame.visible = state.torchOn;
                    if (state.torchOn) {
                        state.fpTorch.flame.material.color.copy(state.torchColor);
                        state.fpTorch.flame.material.emissive.copy(state.torchColor);
                        const flameScale = 1.0 + Math.sin(t_global * 12) * 0.08 + Math.cos(t_global * 23) * 0.04;
                        state.fpTorch.flame.scale.setScalar(flameScale);
                    }
                }

                // Breath/walk bobbing of fp torch
                let bobY = Math.sin(t_global * 2) * 0.005;
                let bobX = Math.cos(t_global * 1) * 0.003;
                if (state.KEY.w || state.KEY.s || state.KEY.a || state.KEY.d) {
                    const walkSpeed = state.KEY.shift ? 10 : 6;
                    bobY += Math.sin(t_global * walkSpeed) * 0.012;
                    bobX += Math.cos(t_global * walkSpeed / 2) * 0.01;
                }
                state.fpTorch.position.set(0.25 + bobX, -0.28 + bobY, -0.45);
            }
        } else {
            if (state.fpTorch) state.fpTorch.visible = false;
            if (state.playerBody && state.playerBody.torchMesh && state.playerBody.torchMesh.flame && state.torchOn) {
                state.playerBody.torchMesh.flame.material.color.copy(state.torchColor);
                state.playerBody.torchMesh.flame.material.emissive.copy(state.torchColor);
                const flameScale = 1.0 + Math.sin(t_global * 12) * 0.08 + Math.cos(t_global * 23) * 0.04;
                state.playerBody.torchMesh.flame.scale.setScalar(flameScale);
            }
        }

        // Spotlight torch emission
        if (state.torch) {
            if (state.torchOn) {
                state.torch.intensity = 1.8
                    + Math.sin(t_global * 6.3) * 0.12
                    + Math.sin(t_global * 17.7) * 0.06;
                state.torch.color.copy(state.torchColor);

                if (state.cameraMode === 'FPS') {
                    state.torch.position.copy(state.camera.position).add(new THREE.Vector3(0.3, -0.2, 0).applyQuaternion(state.camera.quaternion));
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
                    state.torch.target.position.copy(state.torch.position).add(forward);
                } else if (state.playerBody && state.playerBody.rightHand) {
                    state.playerBody.rightHand.getWorldPosition(state.torch.position);
                    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
                    state.torch.target.position.copy(state.torch.position).add(forward);
                }
            } else {
                state.torch.intensity = 0;
            }
        }

        // Update all active wall torches (culling and flickering using embedded PointLights)
        const activeTorches = state.wallTorches.filter(wt => wt.userData.active);
        activeTorches.forEach(wt => {
            wt.userData.distanceToPlayer = state.playerPos.distanceTo(wt.userData.lightWorldPos);
        });

        // Sort active torches by distance to player
        activeTorches.sort((a, b) => a.userData.distanceToPlayer - b.userData.distanceToPlayer);

        for (let i = 0; i < activeTorches.length; i++) {
            const wt = activeTorches[i];
            const randOffset = wt.userData.id * 1.5;
            const pulse = Math.sin(t_global * 12 + randOffset) * 0.08
                + Math.cos(t_global * 23 + randOffset) * 0.04
                + (Math.random() - 0.5) * 0.02; // Realistic high-frequency noise

            // 1. Scale and color the visual flame mesh
            wt.userData.flame.scale.setScalar(wt.userData.baseScale + pulse);
            wt.userData.flame.material.color.copy(state.torchColor);
            wt.userData.flame.material.emissive.copy(state.torchColor);

            // 2. Perform distance-based SpotLight updates and culling (max 4 nearest active lights)
            if (i < 4 && wt.userData.distanceToPlayer < 12.0) {
                if (wt.spotLight) {
                    wt.spotLight.intensity = 4.0 + pulse * 2.0;
                    wt.spotLight.color.copy(state.torchColor);
                    wt.spotLight.visible = true;

                    // Shadow Culling: only the single closest active wall torch casts shadows to save GPU resources
                    if (i === 0 && wt.userData.distanceToPlayer < 9.0) {
                        wt.spotLight.castShadow = true;
                        wt.spotLight.shadow.mapSize.width = 512; // SpotLight shadows are 6x cheaper, so 512 is high quality and fast
                        wt.spotLight.shadow.mapSize.height = 512;
                        wt.spotLight.shadow.bias = -0.002;
                        wt.spotLight.shadow.normalBias = 0.015;
                    } else {
                        wt.spotLight.castShadow = false;
                    }
                }
            } else {
                if (wt.spotLight) {
                    wt.spotLight.intensity = 0;
                    wt.spotLight.visible = false;
                    wt.spotLight.castShadow = false;
                }
            }
        }

        // Raycast for crosshair activation
        let lookingAtTorch = false;
        if (state.isLocked && state.gameStarted && !state.gameWon && !state.paused) {
            const hoverRay = new THREE.Raycaster();
            hoverRay.setFromCamera(new THREE.Vector2(0, 0), state.camera);
            const intersects = hoverRay.intersectObjects(state.wallTorches, true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && obj.parent && !obj.userData.isWallTorch) {
                    obj = obj.parent;
                }
                if (obj && obj.userData.isWallTorch && obj.userData.active) {
                    const dist = state.playerPos.distanceTo(obj.position);
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

    }
    state.renderer.render(state.scene, state.camera);
}

window.addEventListener('resize', () => {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game initialization
init();