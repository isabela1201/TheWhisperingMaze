// objects.js
// Handles placement of interactive scene objects, proximity popup UI,
// collectible tracking and exit door unlock logic.
//
// Collectibles  (novelo id=0, espada id=1, estatua_girl id=2):
//   → CYAN ring via adicionarObjetoFixo. Model + ring vanish on pickup.
//   → Door unlocks when historiasColetadas[1] && historiasColetadas[2].
//  - Non-collectibles (minotauro, golfinho, amfora, fonte — GLB com AnimationMixer):
//   → YELLOW ring. Ring hides when popup is closed. Model stays forever.

import * as THREE from 'three';
import { getGLTFLoader } from './loaderHelper.js';
import * as state from './state.js';
import { S } from './state.js';
import { showNotification, abrirPapiroHistoria } from './ui.js';

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

export let portaSaida = null; // door leaf assigned by door.js

// AnimationMixer for fonte.glb built-in water animation
let _fonteMixer = null;

// ─── Main collectible loader (Cyan ring) ──────────────────────────────────────
export function adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala = 1, isColecionavel = false, idColecionavel = null) {
    const loader = getGLTFLoader();

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

        const floorOffset = -0.5;
        const alturaCompensada = (posY === 0) ? (size.y / 2) : posY;
        const finalY = floorOffset + alturaCompensada;

        model.position.set(posX, finalY, posZ);
        model.rotation.y = grausY * (Math.PI / 180);

        state.scene.add(model);
        state.mazeObjects.push(model);

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
            ringMesh.position.set(posX, finalY + 0.05, posZ);

            state.scene.add(ringMesh);

            ringMesh.userData = { id: idColecionavel, baseY: ringMesh.position.y };
            state.aneisLuminosos.push(ringMesh);

            state.colecionaveis.push({
                id: idColecionavel,
                model: model,
                ring: ringMesh,
                pos: new THREE.Vector3(posX, finalY, posZ),
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
                    child.material.map.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
                }
            }
        });

    }, undefined, (error) => console.error(error));
}

// ─── Non-collectible GLB loader (Yellow ring + proximity popup) ──────────────
export function adicionarNaoColecionavel(path, posX, posZ, grausY, escala, popupKey) {
    const loader = getGLTFLoader();
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
                    c.material.map.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
            }
        });

        state.scene.add(model);
        state.mazeObjects.push(model);

        objetosProximidade.push({
            key: popupKey,
            pos: new THREE.Vector3(posX, finalY, posZ),
            lido: false, ativo: false
        });

    }, undefined, err => console.error('[adicionarNaoColecionavel]', path, err));
}

// ─── Fonte GLB — loads fonte.glb and plays its built-in morph animation ───────
export function adicionarFonte(posX, posZ) {
    const loader = getGLTFLoader();
    loader.load('assets/elements/fonte.glb', (gltf) => {
        setTimeout(() => {
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
                        c.material.map.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
                }
            });

            state.scene.add(model);
            state.mazeObjects.push(model);

            // Play all built-in animation clips (morph water)
            if (gltf.animations && gltf.animations.length > 0) {
                _fonteMixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach(clip => {
                    _fonteMixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
                });
            }

            objetosProximidade.push({
                key: 'fonte',
                pos: new THREE.Vector3(posX, finalY, posZ),
                lido: false, ativo: false
            });
        }, 50);
    }, undefined, err => console.error('[adicionarFonte]', err));
}

// ─── Per-frame fountain update — advances the AnimationMixer ────────────────
// Called from animate() with delta (seconds since last frame).
export function atualizarFonte(delta) {
    if (_fonteMixer) _fonteMixer.update(delta);
}

// ─── Curiosity popup ─────────────────────────────────────────────────────────
let _popupAtivoEntry = null;

export function abrirPopupCuriosidade(entry) {
    const dados = DADOS_POPUP[entry.key];
    if (!dados) return;

    _popupAtivoEntry = entry;
    document.getElementById('curiosidade-icone').textContent  = dados.icone;
    document.getElementById('curiosidade-titulo').textContent = dados.titulo;
    document.getElementById('curiosidade-texto').textContent  = dados.texto;
    document.getElementById('curiosidade-overlay').style.display = 'flex';

    S.setPaused(true);
    document.exitPointerLock();
}

export function fecharPopupCuriosidade() {
    document.getElementById('curiosidade-overlay').style.display = 'none';
    S.setPaused(false);

    if (_popupAtivoEntry) {
        _popupAtivoEntry.lido = true;
        _popupAtivoEntry = null;
    }

    if (state.renderer && state.renderer.domElement) state.renderer.domElement.requestPointerLock();
}

// ─── Proximity check — call every frame ──────────────────────────────────────
const POPUP_DISTANCE      = 3.0;
const POPUP_HIDE_DISTANCE = 4.5;

export function verificarProximidade() {
    if (!state.gameStarted || state.gameWon || state.paused) return;

    for (const obj of objetosProximidade) {
        if (obj.lido) continue;

        const dist = state.playerPos.distanceTo(obj.pos);

        if (dist < POPUP_DISTANCE && !obj.ativo) {
            obj.ativo = true;
            abrirPopupCuriosidade(obj);
        } else if (dist > POPUP_HIDE_DISTANCE && obj.ativo) {
            obj.ativo = false;
            if (_popupAtivoEntry === obj) {
                document.getElementById('curiosidade-overlay').style.display = 'none';
                S.setPaused(false);
                _popupAtivoEntry = null;
                if (state.renderer && state.renderer.domElement) state.renderer.domElement.requestPointerLock();
            }
        }
    }
}

// ─── Door unlock (triggered by collecting espada id=1 + estatua_girl id=2) ───
// historiasColetadas[] is written by the existing abrirPapiroHistoria() when
// the player walks over a collectible registered via adicionarObjetoFixo.
export function verificarColecionaveisEspeciais() {
    if (!state.gameStarted || state.gameWon) return;

    if (state.historiasColetadas[1] && !espada_coletada) {
        espada_coletada = true;
        verificarDesbloqueioPorta();
    }
    if (state.historiasColetadas[2] && !estatua_girl_coletada) {
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
    const a1 = a0 - Math.PI * 0.5;

    function animarPorta(now) {
        const t    = Math.min((now - inicio) / duracao, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        portaSaida.rotation.y = a0 + (a1 - a0) * ease;
        if (t < 1) requestAnimationFrame(animarPorta);
    }
    requestAnimationFrame(animarPorta);
}

// ─── Scene population — called from init() ───────────────────────────────────
export function popularCena() {
    // Collectibles — CYAN ring, model vanishes on pickup, opens story papiro
    // adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala, isColecionavel, idColecionavel)
    adicionarObjetoFixo('assets/elements/novelo_final.glb', 17.22, 0, -1,    212, 5, true, 0);
    adicionarObjetoFixo('assets/elements/espada.glb',       17.04, 0,  2.27,  13, 1, true, 1);
    adicionarObjetoFixo('assets/elements/estatua_girl.glb', 24.29, 0,  7.7,   247, 1, true, 2);

    // Non-collectibles — YELLOW ring, curiosity popup, model stays
    adicionarNaoColecionavel('assets/elements/minotauro.glb',         -10.34,  -24.04, 13, 0.2, 'minotauro');
    adicionarNaoColecionavel('assets/elements/dolphin_sculpture.glb',  -19.06, -14.166,   94, 1,   'dolphin_sculpture');
    adicionarNaoColecionavel('assets/elements/amfora.glb',            -21.07,   29.41, 238, 1,   'amfora');

    // Fonte GLB with built-in AnimationMixer water animation
    adicionarFonte(0, 0);

    // Whisp de instruções inicial na origem
    criarWhispInstrucoes();
}

// ─── Export setter for portaSaida (used by door.js) ──────────────────────────
export function setPortaSaida(doorLeaf) {
    portaSaida = doorLeaf;
}

// ─── Criar o Whisp de Instruções Inicial ──────────────────────────────────────
export function criarWhispInstrucoes() {
    const group = new THREE.Group();
    group.position.set(0, 0.8, 0); // Posicionada na origem e altura do peito

    // 1. Núcleo central (Esfera com Amarelo quente)
    const coreGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00, // Amarelo mais suave e acolhedor
        transparent: true,
        opacity: 0.95
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 2. Brilho Alaranjado (Única aura, para não ser exagerado)
    const glowGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff5500, // Laranja mágico
        transparent: true,
        opacity: 0.4, // Opacidade reduzida para não estourar a luz
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowMesh);

    // 3. Subgrupo para os pirilampos orgânicos
    const pirilamposGroup = new THREE.Group();
    group.add(pirilamposGroup);

    const pirilampoMat = new THREE.MeshBasicMaterial({
        color: 0xfff3cc,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const numPirilampos = 14;
    for (let i = 0; i < numPirilampos; i++) {
        const pirilampoGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const pirilampo = new THREE.Mesh(pirilampoGeo, pirilampoMat);

        pirilampo.userData = {
            angle: Math.random() * Math.PI * 2,
            speed: (0.005 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1),
            baseRadius: 0.20 + Math.random() * 0.35,
            radiusFreq: 0.3 + Math.random() * 0.6,
            baseY: (Math.random() - 0.5) * 0.05,
            floatSpeed: 0.5 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2
        };

        pirilamposGroup.add(pirilampo);
    }

    // Mantém o movimento fluido e biológico dos pirilampos
    coreMesh.onBeforeRender = function() {
        pirilamposGroup.rotation.y = -group.rotation.y;

        const time = performance.now() * 0.001;

        pirilamposGroup.children.forEach(pirilampo => {
            const data = pirilampo.userData;
            data.angle += data.speed;
            const raioDinamico = data.baseRadius + Math.sin(time * data.radiusFreq) * 0.12;

            pirilampo.position.x = Math.cos(data.angle) * raioDinamico;
            pirilampo.position.z = Math.sin(data.angle) * raioDinamico;
            pirilampo.position.y = data.baseY + Math.sin(time * data.floatSpeed + data.phase) * 0.25;
        });
    };

    // 4. Luz projetada no chão (intensidade e alcance reduzidos para não encandear)
    const light = new THREE.PointLight(0xff6600, 1.5, 4.0); // Antes estava 3.0 de intensidade e 5.0 de alcance
    light.position.set(0, 0, 0);
    group.add(light);

    state.scene.add(group);
    S.setPapiroWhisp(group);
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Criar Cogumelos Low Poly Otimizados ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Helper: Cria uma geometria low poly de cogumelo clássico
function criarGeometriaCogumeloA() {
    // Haste (cilindro angular de 4 ou 5 lados)
    const hasteGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 5);
    hasteGeo.translate(0, 0.1, 0); // Reposicionar para a base ficar no Y=0

    // Chapéu (cone angular)
    const chapeuGeo = new THREE.ConeGeometry(0.18, 0.18, 5);
    chapeuGeo.translate(0, 0.25, 0);

    // Mesclar as duas geometrias numa só (requer BufferGeometryUtils, 
    // mas para simplificar e garantir compatibilidade, vamos usar um Group e InstancedMesh por geometria)
    
    // NOTA: Para InstancedMesh funcionar bem com formas mescladas complexas,
    // o ideal é carregar um modelo .glb low-poly ou usar THREE.BufferGeometryUtils.mergeGeometries.
    // Para este exemplo, vamos manter geometrias simples e únicas por InstancedMesh para garantir que funciona.
    return chapeuGeo; // Vamos usar apenas o chapéu como geometria base para o instanciamento neste exemplo simples.
}
