// =============================================================================
// game.js — Core: inicialização, input, câmara, movimento, colisão, render loop
// =============================================================================

const CONFIG = {
    MODEL_PATH: 'labirintov3.glb',
    PLAYER_HEIGHT: 1.6,
    PLAYER_SPEED: 0.12,
    PLAYER_SPRINT: 0.22,
    COLLISION_MARGIN: 0.25,
    FOG_COLOR: 0xE0F7FA,
    EXIT_RADIUS: 1.5
};

let paused = false;
let scene, camera, renderer, clock;
let gameStarted = false, gameWon = false;
let mazeObjects = [], exitPos = new THREE.Vector3(10, 0, 10);

// --- PARTÍCULAS (Whispers / Pirilampos) — lógica em extras.js ---
const WHISPER_COUNT = 200;
const WHISPER_SPREAD = 60;
let whispers, whisperMeta = [], whisperPrevTime = 0;

let vegetation = [];
let doors = [];
let bobTimer = 0;

// --- FIX B: CORPO DO JOGADOR — criado em extras.js ---
let playerBody = null;

// --- LANTERNA (Slides 05 — SpotLight, atenuação quadrática 1/d²) ---
let torch = null;
let torchOn = true; // começa ligada

// --- CÂMARA FPS / TPS (Slides 04 — View Matrix / Projeção) ---
let cameraMode = 'FPS';
const TPS_DISTANCE = 2.5;
let playerPos = new THREE.Vector3();

// --- CICLO DIA/NOITE — keyframes em extras.js ---
const DAY_CYCLE_DURATION = 180; // 180 para efeitos de visualização 300 para jogo!
const DAY_PHASE_NAMES = ['Amanhecer', 'Meio-Dia', 'Por-do-Sol', 'Noite'];
let sunLight, ambientLight, hemiLight;
let mazeMaterials = [];
let DAY_PHASES = null;
let currentPhase = '';
let whisperBrightnessMult = 1.0;

const KEY = { w: false, a: false, s: false, d: false, shift: false };
let yaw = 0, pitch = 0, isLocked = false;

// =============================================================================
// INIT
// =============================================================================
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.FOG_COLOR);
    scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, 5, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Chão com texturas de relva
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
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            floorMat[prop] = tex;
            floorMat.needsUpdate = true;
        });
    }

    loadFloorTex('assets/grass/aerial_grass_rock_diff_1k.png', 'map');
    loadFloorTex('assets/grass/aerial_grass_rock_nor_gl_1k.png', 'normalMap');
    loadFloorTex('assets/grass/aerial_grass_rock_rough_1k.png', 'roughnessMap');

    setupLighting();
    setupDayNightCycle(); // keyframes em extras.js
    setupInput();
    createWhispers();     // extras.js
    createPlayerBody();   // extras.js
    SkyEnvironment.init(scene); // sky.js
    loadMazeModel();
    animate();
}

// =============================================================================
// ILUMINAÇÃO
// =============================================================================
function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff0f0, 1.0);
    sunLight.position.set(20, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // SpotLight — cone de luz com atenuação quadrática 1/d² (Slides 05)
    // angle: Math.PI/7 (~25.7°) | penumbra: 0.35 | decay: 2 → 1/d²
    torch = new THREE.SpotLight(0xfffee0, 1.8, 18, Math.PI / 7, 0.35, 2);
    torch.target.position.set(0, 0, -1); // cone aponta diretamente para a frente
    camera.add(torch);
    camera.add(torch.target);
    scene.add(camera);
}

// =============================================================================
// INPUT
// =============================================================================
function setupInput() {
    window.addEventListener('keydown', (e) => {
        const key = e.code.toLowerCase();
        if (key === 'keyw') KEY.w = true;
        if (key === 'keys') KEY.s = true;
        if (key === 'keya') KEY.a = true;
        if (key === 'keyd') KEY.d = true;
        if (e.shiftKey) KEY.shift = true;

        // Toggle FPS/TPS com C (Slides 04 — câmaras)
        if (e.code === 'KeyC' && gameStarted && !gameWon) toggleCamera();

        // Toggle Lanterna com F (Slides 05 — SpotLight)
        if (e.code === 'KeyF' && gameStarted && !gameWon) {
            torchOn = !torchOn;
            torch.intensity = torchOn ? 1.8 : 0;
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
}

// =============================================================================
// MODELO DO LABIRINTO
// =============================================================================
function loadMazeModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(CONFIG.MODEL_PATH, (gltf) => {
        const model = gltf.scene;
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

                // FIX A: Materiais PBR + Otimização de Texturas + Emissive nocturno
                if (child.material) {
                    child.material.roughness = 0.9;
                    child.material.metalness = 0.0;
                    child.material.metalnessMap = null;
                    child.material.envMapIntensity = 0.2;
                    child.material.emissive = new THREE.Color(0x334488);
                    child.material.emissiveIntensity = 0.0;
                    child.material.needsUpdate = true;

                    if (child.material.map) {
                        child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
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
    });
}

// =============================================================================
// MOVIMENTO E COLISÃO
// =============================================================================
function updateMovement() {
    if (!gameStarted || gameWon || paused) return;

    const speed = KEY.shift ? CONFIG.PLAYER_SPRINT : CONFIG.PLAYER_SPEED;
    const moveDir = new THREE.Vector3();

    if (KEY.w) moveDir.z -= 1;
    if (KEY.s) moveDir.z += 1;
    if (KEY.a) moveDir.x -= 1;
    if (KEY.d) moveDir.x += 1;

    if (moveDir.lengthSq() === 0) {
        playerPos.y = THREE.MathUtils.lerp(playerPos.y, CONFIG.PLAYER_HEIGHT, 0.1);
        return;
    }

    moveDir.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right   = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    const finalDirection = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z)
        .addScaledVector(right, moveDir.x)
        .normalize()
        .multiplyScalar(speed);

    // Head bobbing — aplicado a playerPos (Slides 03)
    bobTimer += KEY.shift ? 0.22 : 0.14;
    playerPos.y = CONFIG.PLAYER_HEIGHT + Math.sin(bobTimer) * 0.04;

    // Colisões via Raycaster (Slides 04)
    const origin = new THREE.Vector3(playerPos.x, 0.5, playerPos.z);

    const rayX = new THREE.Raycaster(origin, new THREE.Vector3(Math.sign(finalDirection.x), 0, 0), 0, CONFIG.COLLISION_MARGIN);
    if (rayX.intersectObjects(mazeObjects, false).length === 0) playerPos.x += finalDirection.x;

    const rayZ = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, Math.sign(finalDirection.z)), 0, CONFIG.COLLISION_MARGIN);
    if (rayZ.intersectObjects(mazeObjects, false).length === 0) playerPos.z += finalDirection.z;
}

// =============================================================================
// LOOP DE ANIMAÇÃO
// =============================================================================
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && !gameWon && !paused) {
        // 1. Movimento do jogador
        updateMovement();
        updateAnimations(); // extras.js: partículas + dia/noite + vegetação

        // 2. Câmara (Slides 04 — View Matrix e Projeção Perspectiva)
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

            // Colisão da câmara TPS — Raycasting aplicado à view (Slides 04)
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

        // 3. Verificar vitória
        if (playerPos.distanceTo(exitPos) < CONFIG.EXIT_RADIUS) {
            gameWon = true;
            document.exitPointerLock();
            document.getElementById('win-screen').style.display = 'flex';
        }

        // 4. Sincronizar corpo do jogador (Hierarquia — Slides 03)
        if (playerBody) {
            playerBody.position.set(playerPos.x, playerPos.y - 1.25, playerPos.z);
            playerBody.rotation.y = yaw + Math.PI;
        }

        // 5. Piscar da lanterna — ruído de frequência dupla (Slides 05)
        if (torch && torchOn) {
            const t_global = clock.getElapsedTime();
            torch.intensity = 1.8
                + Math.sin(t_global * 6.3) * 0.12
                + Math.sin(t_global * 17.7) * 0.06;
        }

        // 6. Debug
        updateDebug();
    }
    renderer.render(scene, camera);
}

// =============================================================================
// TOGGLE CÂMARA FPS / TPS (Slides 04)
// =============================================================================
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
    camera.updateProjectionMatrix(); // recalcula a matriz de projeção — Slides 04
}

// =============================================================================
// DEBUG
// =============================================================================
function updateDebug() {
    const debugEl = document.getElementById('debug');
    if (!debugEl) return;
    const p = (playerPos.lengthSq() > 0) ? playerPos : camera.position;
    const lockIcon = isLocked ? '✓' : '✗';
    const phase = currentPhase ? ` | ${currentPhase}` : '';
    debugEl.textContent =
        `${cameraMode}${phase} | X:${p.x.toFixed(2)}  Z:${p.z.toFixed(2)}  |  Lock:${lockIcon}`;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();