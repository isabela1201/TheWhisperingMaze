// objects.js
// Handles placement of interactive scene objects, proximity popup UI,
// collectible tracking and exit door unlock logic.
//
// Collectibles  (novelo id=0, espada id=1, estatua_girl id=2):
//   → CYAN ring via adicionarObjetoFixo. Model + ring vanish on pickup.
//   → Door unlocks when historiasColetadas[1] && historiasColetadas[2].
//  - Non-collectibles (minotauro, golfinho, amfora, fonte — GLB com AnimationMixer):
//   → YELLOW ring. Ring hides when popup is closed. Model stays forever.

// ─── Curiosity popup content ─────────────────────────────────────────────────
const DADOS_POPUP = {
    minotauro: {
        titulo: '🐂 O Minotauro de Creta',
        icone: '🐂',
        texto: `O Minotauro — metade homem, metade touro — nasceu da união entre Pasífae, rainha de Creta, e um touro divino enviado por Posídon. O rei Minos, envergonhado, encomendou ao mestre artesão Dédalo a construção de um labirinto intrincado sob o Palácio de Cnossos para encarcerar a criatura. A cada nove anos, Atenas enviava sete jovens e sete donzelas como tributo, condenados a vaguear no labirinto até serem devorados. Foi Teseu, filho do rei ateniense Egeu, quem se voluntariou para pôr fim ao terror. Com a ajuda do fio de Ariadne, filha de Minos, Teseu matou o Minotauro e encontrou o caminho de volta para a luz.`
    },
    dolphin_sculpture: {
        titulo: '🐬 A Dança dos Golfinhos Minoicos',
        icone: '🐬',
        texto: `Os golfinhos eram um símbolo sagrado da civilização minoica, representando a ligação profunda deste povo com o Mar Mediterrâneo. O famoso fresco dos Golfinhos, descoberto no Palácio de Cnossos (~1600 a.C.), decorava o Megaron da Rainha e é uma das mais belas obras de arte do mundo egeu. Os minoicos eram navegadores e comerciantes habilidosos, estendendo as suas rotas até ao Egito, Síria e Grécia continental. Acredita-se que a civilização de Creta inspirou o mito de Atlântida descrito por Platão, após o seu colapso repentino por volta de 1450 a.C., possivelmente causado pela erupção do vulcão de Tera (Santorini).`
    },
    amfora: {
        titulo: '🏺 A Ânfora e o Comércio Minoico',
        icone: '🏺',
        texto: `As ânforas eram o principal recipiente de transporte do Mediterrâneo Antigo. Os minoicos usavam-nas para exportar azeite, vinho, mel e perfumes por toda a região egeia. O Palácio de Cnossos possuía vastos armazéns com centenas de pithoi (grandes jarros de cerâmica) para armazenar os excedentes agrícolas. A cerâmica minoica era famosa pela sua qualidade e padrões decorativos sofisticados — inspirados no mar, na natureza e em motivos geométricos. Estas trocas comerciais criaram uma rede cultural que influenciou profundamente a Grécia Clássica e, por consequência, toda a civilização ocidental.`
    },
    fonte: {
        titulo: '💧 A Água Sagrada de Cnossos',
        icone: '💧',
        texto: `O Palácio de Cnossos (construído por volta de 2000 a.C.) foi uma das primeiras estruturas do mundo a possuir um sistema de canalização de água corrente, com condutas de terracota para abastecimento e drenagem. A água tinha um papel ritual central na religião minoica — as deusas-serpente eram associadas à fertilidade da terra e à água subterrânea. Fontes e banhos eram elementos essenciais nos palácios minoicos, refletindo uma sofisticação urbana que não seria igualada na Europa por mais de mil anos.`
    }
};

// ─── Runtime state ────────────────────────────────────────────────────────────
let objetosProximidade = []; // { key, pos, anel, lido, ativo }

let espada_coletada       = false;
let estatua_girl_coletada = false;
let portaDesbloqueada     = false;

let portaSaida = null; // door leaf assigned by door.js

// AnimationMixer for fonte.glb built-in water animation
let _fonteMixer = null;

// ─── Non-collectible GLB loader (Yellow ring + proximity popup) ──────────────
function adicionarNaoColecionavel(path, posX, posZ, grausY, escala, popupKey) {
    const loader = new THREE.GLTFLoader();
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(escala);

        model.traverse(c => { if (c.isMesh) c.geometry.computeBoundingBox(); });
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getSize(size);

        const finalY = -0.5 + size.y / 2;
        model.position.set(posX, finalY, posZ);
        model.rotation.y = grausY * (Math.PI / 180);

        model.traverse(c => {
            if (c.isMesh) {
                c.castShadow = c.receiveShadow = true;
                if (c.material && c.material.map)
                    c.material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
            }
        });

        scene.add(model);
        mazeObjects.push(model);

        // Yellow glow ring
        const ri = Math.max(size.x, size.z) * 0.55;
        const ro = ri * (4 / 3);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2.5,
            side: THREE.DoubleSide, transparent: true, opacity: 0.7
        });
        const anel = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 36), ringMat);
        anel.rotation.x = -Math.PI / 2;
        anel.position.set(posX, finalY + 0.05, posZ);
        anel.userData = { baseY: anel.position.y };
        scene.add(anel);
        aneisLuminosos.push(anel);

        objetosProximidade.push({
            key: popupKey,
            pos: new THREE.Vector3(posX, finalY, posZ),
            anel, lido: false, ativo: false
        });

    }, undefined, err => console.error('[adicionarNaoColecionavel]', path, err));
}

// ─── Fonte GLB — loads fonte.glb and plays its built-in morph animation ───────
function adicionarFonte(posX, posZ) {
    const loader = new THREE.GLTFLoader();
    loader.load('assets/elements/fonte.glb', (gltf) => {
        const model = gltf.scene;

        model.traverse(c => { if (c.isMesh) c.geometry.computeBoundingBox(); });
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getSize(size);

        const finalY = -0.5 + size.y / 2;
        model.position.set(posX, finalY, posZ);

        model.traverse(c => {
            if (c.isMesh) {
                c.castShadow = c.receiveShadow = true;
                if (c.material && c.material.map)
                    c.material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
            }
        });

        scene.add(model);
        mazeObjects.push(model);

        // Play all built-in animation clips (morph water)
        if (gltf.animations && gltf.animations.length > 0) {
            _fonteMixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach(clip => {
                _fonteMixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
            });
        }

        // Yellow proximity ring
        const ri = Math.max(size.x, size.z) * 0.55;
        const ro = ri * (4 / 3);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2.5,
            side: THREE.DoubleSide, transparent: true, opacity: 0.7
        });
        const anel = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 36), ringMat);
        anel.rotation.x = -Math.PI / 2;
        anel.position.set(posX, finalY + 0.05, posZ);
        anel.userData = { baseY: anel.position.y };
        scene.add(anel);
        aneisLuminosos.push(anel);

        objetosProximidade.push({
            key: 'fonte',
            pos: new THREE.Vector3(posX, finalY, posZ),
            anel, lido: false, ativo: false
        });

    }, undefined, err => console.error('[adicionarFonte]', err));
}

// ─── Per-frame fountain update — advances the AnimationMixer ────────────────
// Called from animate() with delta (seconds since last frame).
function atualizarFonte(delta) {
    if (_fonteMixer) _fonteMixer.update(delta);
}

// ─── Curiosity popup ─────────────────────────────────────────────────────────
let _popupAtivoEntry = null;

function abrirPopupCuriosidade(entry) {
    const dados = DADOS_POPUP[entry.key];
    if (!dados) return;

    _popupAtivoEntry = entry;
    document.getElementById('curiosidade-icone').textContent  = dados.icone;
    document.getElementById('curiosidade-titulo').textContent = dados.titulo;
    document.getElementById('curiosidade-texto').textContent  = dados.texto;
    document.getElementById('curiosidade-overlay').style.display = 'flex';

    paused = true;
    document.exitPointerLock();
}

function fecharPopupCuriosidade() {
    document.getElementById('curiosidade-overlay').style.display = 'none';
    paused = false;

    if (_popupAtivoEntry) {
        _popupAtivoEntry.lido = true;
        const anel = _popupAtivoEntry.anel;
        if (anel) {
            anel.visible = false;
            const idx = aneisLuminosos.indexOf(anel);
            if (idx !== -1) aneisLuminosos.splice(idx, 1);
        }
        _popupAtivoEntry = null;
    }

    if (renderer && renderer.domElement) renderer.domElement.requestPointerLock();
}

// ─── Proximity check — call every frame ──────────────────────────────────────
const POPUP_DISTANCE      = 3.0;
const POPUP_HIDE_DISTANCE = 4.5;

function verificarProximidade() {
    if (!gameStarted || gameWon || paused) return;

    for (const obj of objetosProximidade) {
        if (obj.lido) continue;

        const dist = playerPos.distanceTo(obj.pos);

        if (dist < POPUP_DISTANCE && !obj.ativo) {
            obj.ativo = true;
            abrirPopupCuriosidade(obj);
        } else if (dist > POPUP_HIDE_DISTANCE && obj.ativo) {
            obj.ativo = false;
            if (_popupAtivoEntry === obj) {
                document.getElementById('curiosidade-overlay').style.display = 'none';
                paused = false;
                _popupAtivoEntry = null;
                if (renderer && renderer.domElement) renderer.domElement.requestPointerLock();
            }
        }
    }
}

// ─── Door unlock (triggered by collecting espada id=1 + estatua_girl id=2) ───
// historiasColetadas[] is written by the existing abrirPapiroHistoria() when
// the player walks over a collectible registered via adicionarObjetoFixo.
function verificarColecionaveisEspeciais() {
    if (!gameStarted || gameWon) return;

    if (historiasColetadas[1] && !espada_coletada) {
        espada_coletada = true;
        verificarDesbloqueioPorta();
    }
    if (historiasColetadas[2] && !estatua_girl_coletada) {
        estatua_girl_coletada = true;
        verificarDesbloqueioPorta();
    }
}

function verificarDesbloqueioPorta() {
    if (espada_coletada && estatua_girl_coletada && !portaDesbloqueada) {
        portaDesbloqueada = true;
        abrirPortaSaida();
    }
}

function abrirPortaSaida() {
    if (!portaSaida) return;
    showNotification('🚪 A porta de saída abriu-se! Encontra a saída do labirinto!');

    const duracao = 1800;
    const inicio  = performance.now();
    const a0 = portaSaida.rotation.y;
    const a1 = a0 + Math.PI * 0.85;

    function animarPorta(now) {
        const t    = Math.min((now - inicio) / duracao, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        portaSaida.rotation.y = a0 + (a1 - a0) * ease;
        if (t < 1) requestAnimationFrame(animarPorta);
    }
    requestAnimationFrame(animarPorta);
}

// ─── Scene population — called from init() ───────────────────────────────────
function popularCena() {
    // Collectibles — CYAN ring, model vanishes on pickup, opens story papiro
    // adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala, isColecionavel, idColecionavel)
    adicionarObjetoFixo('assets/elements/novelo_final.glb', 17.22, 0, -1,    212, 5, true, 0);
    adicionarObjetoFixo('assets/elements/espada.glb',       17.04, 0,  2.27,  13, 1, true, 1);
    adicionarObjetoFixo('assets/elements/estatua_girl.glb', 24.29, 0,  7.7,   67, 1, true, 2);

    // Non-collectibles — YELLOW ring, curiosity popup, model stays
    adicionarNaoColecionavel('assets/elements/minotauro.glb',         -19.06, -14.166,   4, 0.2, 'minotauro');
    adicionarNaoColecionavel('assets/elements/dolphin_sculpture.glb',  -8.65,  -20.29, 191, 1,   'dolphin_sculpture');
    adicionarNaoColecionavel('assets/elements/amfora.glb',            -21.07,   29.41, 238, 1,   'amfora');

    // Fonte GLB with built-in AnimationMixer water animation
    adicionarFonte(0, 0);
}
