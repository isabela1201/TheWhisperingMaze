// =============================================================================
// game.js — HISTORIAS
// =============================================================================

const DADOS_HISTORIAS = [
    {
        titulo: "📜 Fragmento I — O Fio de Ariadne",
        texto: "\"O novelo de lã azul não brilha por acaso. Segue o rastro da coragem. Onde o Minotauro range os dentes, a salvação vira as costas à criatura e aponta para o nascer do sol...\"",
        emoji: "🧶"
    },
    {
        titulo: "⚔️ Fragmento II — A Lâmina de Creta",
        texto: "\"O ferro cretense corta o mito. Quando a lâmina reflectir o crepúsculo, o caminho não está no sangue, mas sim no trilho onde a água flui contra a corrente...\"",
        emoji: "🗡️"
    },
    {
        titulo: "🏛️ Fragmento III — O Segredo de Dédalo",
        texto: "\"As paredes de Dédalo enganam os olhos, mas não o coração. Onde os Cornos Sagrados tocam o céu, o fio termina e a liberdade encontra-se nas sombras do Norte...\"",
        emoji: "🐂"
    }
];

let idHistoriaAtivaAtualmente = null; // Controla qual o papiro aberto


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
const DAY_CYCLE_DURATION = 360; // Alterado para 1m 30s
const DAY_PHASE_NAMES = ['Amanhecer', 'Meio-Dia', 'Por-do-Sol', 'Noite'];
let sunLight, ambientLight, hemiLight;
let mazeMaterials = [];
let DAY_PHASES = null;
let currentPhase = '';
let whisperBrightnessMult = 1.0;

// KEY agora inclui 'space' e 'control' para o modo de voo
const KEY = { w: false, a: false, s: false, d: false, shift: false, space: false, control: false };
let yaw = 0, pitch = 0, isLocked = false;
let flyMode = false;

// --- SISTEMA DE COLECIONÁVEIS ---
let colecionaveis = []; // Guarda os dados dos 3 colecionáveis
let aneisLuminosos = []; // Guarda as malhas dos anéis para animar no loop
let historiasColetadas = [false, false, false]; // Estado do progresso


// =============================================================================
// FUNÇÃO UNIVERSAL PARA ASSETS FIXOS (Com Auto-Alinhamento no Chão)
// =============================================================================
function adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala = 1, isColecionavel = false, idColecionavel = null) {
    const loader = new THREE.GLTFLoader();
    
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(escala);
        
        // Calcular Bounding Box para alinhamento no chão
        model.traverse((child) => {
            if (child.isMesh) child.geometry.computeBoundingBox();
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const alturaCompensada = (posY === 0) ? (size.y / 2) : posY;
        model.position.set(posX, alturaCompensada, posZ);
        model.rotation.y = grausY * (Math.PI / 180);
        
        scene.add(model);
        mazeObjects.push(model);

        // Se for um Colecionável, cria o Efeito Luminoso (Auréola)
        if (isColecionavel) {
            const ringGeo = new THREE.RingGeometry(size.x * 0.6, size.x * 0.8, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x00aaff,          // Brilho azul ciano
                emissive: 0x00aaff,       // Brilho próprio
                emissiveIntensity: 2.0,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            
            // Rodar o anel para ficar deitado no chão (X = -90 graus)
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.set(posX, alturaCompensada + 0.05, posZ);
            
            scene.add(ringMesh);
            
            // Guardar uma referência ao anel e aos dados do colecionável
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

        // Sombras normais
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material && child.material.map) {
                    child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                }
            }
        });
        
    }, undefined, (error) => console.error(error));
}

// =============================================================================
// FUNÇÕES DOS PAPIROS
// =============================================================================
function abrirPapiroHistoria(id) {
    idHistoriaAtivaAtualmente = id;
    historiasColetadas[id] = true;
    
    document.getElementById('papiro-titulo').textContent = DADOS_HISTORIAS[id].titulo;
    document.getElementById('papiro-texto').innerHTML = DADOS_HISTORIAS[id].texto;
    document.getElementById('papiro-btn-acao').textContent = "Compreendi o Enigma";
    
    const emojiSlot = document.getElementById(`emoji-slot-${id}`);
    if (emojiSlot) {
        emojiSlot.textContent = DADOS_HISTORIAS[id].emoji;
        emojiSlot.classList.add('coletado');
    }
    
    paused = true;
    document.exitPointerLock();
    document.getElementById('papiro-overlay').style.display = 'flex';
}

function fecharPapiro() {
    document.getElementById('papiro-overlay').style.display = 'none';
    paused = false;
    renderer.domElement.requestPointerLock();
}

function reverHistoria(id) {
    if (historiasColetadas[id]) {
        abrirPapiroHistoria(id);
    }
}

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
    setupDayNightCycle(); 
    setupInput();
    createWhispers();     
    createPlayerBody();   
    SkyEnvironment.init(scene); 
    loadMazeModel();

    adicionarObjetoFixo('assets/elements/novelo_final.glb', 17.22, 0, -1, 212, 5, true, 0);

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

    torch = new THREE.SpotLight(0xfffee0, 1.8, 18, Math.PI / 7, 0.35, 2);
    scene.add(torch);
    scene.add(torch.target);
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
        if (key === 'space') KEY.space = true;
        if (key === 'controlleft' || key === 'controlright') KEY.control = true;

        if (e.code === 'KeyC' && gameStarted && !gameWon) toggleCamera();

        if (e.code === 'KeyF' && gameStarted && !gameWon) {
            torchOn = !torchOn;
            torch.intensity = torchOn ? 1.8 : 0;
        }

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

    // Lógica do Modo de Voo
    if (flyMode) {
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right   = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        
        const finalDirection = new THREE.Vector3()
            .addScaledVector(forward, -moveDir.z)
            .addScaledVector(right, moveDir.x);
            
        if (finalDirection.lengthSq() > 0) {
            finalDirection.normalize().multiplyScalar(speed);
        }

        if (KEY.space) playerPos.y += speed;     // Sobe com o Space
        if (KEY.control) playerPos.y -= speed;   // Desce com o Control

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

    // Colisões via Raycaster
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
        // 1. Animar os Anéis Luminosos (Auréolas)
        const tempo = clock.getElapsedTime();
        for (let ring of aneisLuminosos) {
            ring.rotation.z += 0.02;
            ring.position.y = ring.userData.baseY + Math.sin(tempo * 3) * 0.08;
        }

        // 2. Verificar Proximidade com os Colecionáveis
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

        // 3. Movimento do jogador
        updateMovement();
        updateAnimations(); 

        // 4. Câmara
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

        // 5. Verificar vitória
        if (playerPos.distanceTo(exitPos) < CONFIG.EXIT_RADIUS) {
            gameWon = true;
            document.exitPointerLock();
            document.getElementById('win-screen').style.display = 'flex';
        }

        // 6. Sincronizar corpo do jogador
        if (playerBody) {
            playerBody.position.set(playerPos.x, playerPos.y - 1.63, playerPos.z);
            playerBody.rotation.y = yaw + Math.PI;
        }

        // 7. Piscar da lanterna e posicionamento
        if (torch && torchOn) {
            const t_global = clock.getElapsedTime();
            torch.intensity = 1.8
                + Math.sin(t_global * 6.3) * 0.12
                + Math.sin(t_global * 17.7) * 0.06;

            if (cameraMode === 'FPS') {
                torch.position.copy(camera.position).add(new THREE.Vector3(0.3, -0.2, 0).applyQuaternion(camera.quaternion));
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                torch.target.position.copy(torch.position).add(forward);
            } else if (playerBody && playerBody.rightHand) {
                playerBody.rightHand.getWorldPosition(torch.position);
                const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                torch.target.position.copy(torch.position).add(forward);
            }
        }

        // 8. Debug
        updateDebug();
    }
    renderer.render(scene, camera);
}

// =============================================================================
// TOGGLE CÂMARA FPS / TPS
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
    camera.updateProjectionMatrix();
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
    const flyStatus = flyMode ? ' | VOO' : '';
    debugEl.textContent =
        `${cameraMode}${phase}${flyStatus} | X:${p.x.toFixed(2)}  Y:${p.y.toFixed(2)}  Z:${p.z.toFixed(2)}  |  Lock:${lockIcon}`;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();