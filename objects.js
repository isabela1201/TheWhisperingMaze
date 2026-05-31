// objects.js
// Handles placement of interactive scene objects, proximity popup UI,
// collectible tracking, and exit door unlock logic.
//
// Collectibles (novelo id=0, espada id=1, estatua_girl id=2):
//   → Cyan ring via adicionarObjetoFixo. Model + ring vanish on pickup.
//   → Door unlocks when historiasColetadas[1] && historiasColetadas[2].
//
// Non-collectibles (minotauro, golfinho, amfora):
//   → Curiosity popup on proximity. Model stays forever.

import * as THREE from 'three';
import { getGLTFLoader } from './loaderHelper.js';
import * as state from './state.js';
import { S } from './state.js';
import { CONFIG, DADOS_POPUP } from './config.js';
import { showNotification, abrirPapiroHistoria } from './ui.js';

// ─── Runtime state ────────────────────────────────────────────────────────────
let objetosProximidade = []; // { key, pos, lido, ativo }

let novelo_coletado       = false;
let espada_coletada       = false;
let estatua_girl_coletada = false;
let portaDesbloqueada     = false;

export let portaSaida = null; // door leaf assigned by door.js

// ─── Shared material setup helper ─────────────────────────────────────────────
// Ensures all loaded GLB meshes have consistent shadow, roughness and colour space
function applyMeshDefaults(child) {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
        child.material.metalness = 0.0;
        child.material.roughness = Math.max(0.6, child.material.roughness || 0.6);
        child.material.needsUpdate = true;
        if (child.material.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
            child.material.map.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
        }
    }
}

// ─── Collectible GLB loader (cyan ring) ───────────────────────────────────────
export function adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala = 1, isColecionavel = false, idColecionavel = null) {
    const loader = getGLTFLoader();

    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(escala);

        // Apply shadow + material settings
        model.traverse(applyMeshDefaults);

        // Align base to floor using bounding box height
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const finalY = -0.5 + ((posY === 0) ? (size.y / 2) : posY);
        model.position.set(posX, finalY, posZ);
        model.rotation.y = grausY * (Math.PI / 180);

        state.scene.add(model);
        state.mazeObjects.push(model);

        // Cyan glow ring for collectibles
        if (isColecionavel) {
            const ringGeo = new THREE.RingGeometry(size.x * 0.6, size.x * 0.8, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x00aaff,
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
                model,
                ring: ringMesh,
                pos: new THREE.Vector3(posX, finalY, posZ),
                coletado: false
            });
        }

    }, undefined, (error) => console.error('[adicionarObjetoFixo]', path, error));
}

// ─── Non-collectible GLB loader (curiosity popup on proximity) ────────────────
export function adicionarNaoColecionavel(path, posX, posY, posZ, grausX, grausY, grausZ, escala, popupKey) {
    const loader = getGLTFLoader();

    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(escala);

        // Apply rotation before computing bounding box so the height is correct
        model.rotation.set(
            grausX * (Math.PI / 180),
            grausY * (Math.PI / 180),
            grausZ * (Math.PI / 180)
        );
        model.updateMatrixWorld(true);

        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getSize(size);

        const finalY = -0.5 + ((posY === 0) ? (size.y / 2) : posY);
        model.position.set(posX, finalY, posZ);

        model.traverse(applyMeshDefaults);

        state.scene.add(model);
        state.mazeObjects.push(model);

        objetosProximidade.push({
            key: popupKey,
            pos: new THREE.Vector3(posX, finalY, posZ),
            lido: false,
            ativo: false
        });

    }, undefined, err => console.error('[adicionarNaoColecionavel]', path, err));
}

// ─── Curiosity popup ──────────────────────────────────────────────────────────
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

// ─── Per-frame proximity check ────────────────────────────────────────────────
export function verificarProximidade() {
    if (!state.gameStarted || state.gameWon || state.paused) return;

    for (const obj of objetosProximidade) {
        if (obj.lido) continue;

        const dist = state.playerPos.distanceTo(obj.pos);

        if (dist < CONFIG.POPUP_DISTANCE && !obj.ativo) {
            obj.ativo = true;
            abrirPopupCuriosidade(obj);
        } else if (dist > CONFIG.POPUP_HIDE_DISTANCE && obj.ativo) {
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

// ─── Door unlock (espada id=1 + estatua_girl id=2) ────────────────────────────
export function verificarColecionaveisEspeciais() {
    if (!state.gameStarted || state.gameWon) return;

    if (state.historiasColetadas[0] && !novelo_coletado) {
        novelo_coletado = true;
        verificarDesbloqueioPorta();
    }
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
    if (novelo_coletado && espada_coletada && estatua_girl_coletada && !portaDesbloqueada) {
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
    // Collectibles — cyan ring, model + ring vanish on pickup, opens story papiro
    // adicionarObjetoFixo(path, posX, posY, posZ, grausY, escala, isColecionavel, idColecionavel)
    adicionarObjetoFixo('assets/elements/novelo_final.glb', 17.22, 0.6, -1,    212, 5, true, 0);
    adicionarObjetoFixo('assets/elements/espada.glb',       17.04, 1,  2.27,  13, 1, true, 1);
    adicionarObjetoFixo('assets/elements/estatua_girl.glb', 24.29, 1.7,  7.7,   180, 1, true, 2);

    // Non-collectibles — curiosity popup on proximity, model stays
    // adicionarNaoColecionavel(path, posX, posY, posZ, grausX, grausY, grausZ, escala, popupKey)
    adicionarNaoColecionavel('assets/elements/minotauro.glb',         -8.88, 0, -21.21, 0, 13, 0, 0.2, 'minotauro');
    adicionarNaoColecionavel('assets/elements/dolphin_sculpture.glb',  -21.49, -0.001, -15.16, 0, 146.9, 0, 1, 'dolphin_sculpture');
    adicionarNaoColecionavel('assets/elements/amfora.glb',             -21.61, 0, 29.56, -90, 0, 0, 0.25, 'amfora');

    // Instructions whisp at the start position
    criarWhispInstrucoes();
}

// ─── Setter for portaSaida (called by door.js after creating the door leaf) ───
export function setPortaSaida(doorLeaf) {
    portaSaida = doorLeaf;
}

// ─── Instructions whisp — animated floating orb near start ───────────────────
export function criarWhispInstrucoes() {
    const group = new THREE.Group();
    group.position.set(0, 0.8, 0);

    // Central glowing core
    const coreMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 })
    );
    group.add(coreMesh);

    // Soft orange aura
    group.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    ));

    // Orbiting firefly particles
    const pirilamposGroup = new THREE.Group();
    group.add(pirilamposGroup);

    const pirilampoMat = new THREE.MeshBasicMaterial({
        color: 0xfff3cc,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    for (let i = 0; i < 14; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), pirilampoMat);
        p.userData = {
            angle:      Math.random() * Math.PI * 2,
            speed:      (0.005 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1),
            baseRadius: 0.20 + Math.random() * 0.35,
            radiusFreq: 0.3  + Math.random() * 0.6,
            baseY:      (Math.random() - 0.5) * 0.05,
            floatSpeed: 0.5  + Math.random() * 0.7,
            phase:      Math.random() * Math.PI * 2
        };
        pirilamposGroup.add(p);
    }

    // Update firefly positions each frame via onBeforeRender
    coreMesh.onBeforeRender = function () {
        pirilamposGroup.rotation.y = -group.rotation.y;
        const time = performance.now() * 0.001;
        pirilamposGroup.children.forEach(p => {
            const d = p.userData;
            d.angle += d.speed;
            const r = d.baseRadius + Math.sin(time * d.radiusFreq) * 0.12;
            p.position.set(
                Math.cos(d.angle) * r,
                d.baseY + Math.sin(time * d.floatSpeed + d.phase) * 0.25,
                Math.sin(d.angle) * r
            );
        });
    };

    // Warm point light projected onto the floor
    const light = new THREE.PointLight(0xff6600, 1.5, 4.0);
    group.add(light);

    state.scene.add(group);
    S.setPapiroWhisp(group);
}
