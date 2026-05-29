// ui.js
// Handles user interface components, notifications, papiros, and debug info

import * as state from './state.js';
import { S } from './state.js';
import { DADOS_HISTORIAS } from './config.js';

const INSTRUCTION_PAGES = [
    {
        titulo: "📖 A Lenda de Creta (1/3)",
        texto: "O rei Minos de Creta ordenou a Dédalo que construísse um labirinto para aprisionar o Minotauro, uma besta terrível de corpo humano e cabeça de touro, que se alimentava de sacrifícios humanos."
    },
    {
        titulo: "⚔️ O Triunfo de Teseu (2/3)",
        texto: "Teseu ofereceu-se para deter o monstro. Com a ajuda da princesa Ariadne, que lhe entregou um novelo de fio de ouro para marcar o caminho de regresso, ele derrotou o Minotauro e escapou."
    },
    {
        titulo: "🌟 O Jardim Sussurrante (3/3)",
        texto: "Após a vitória, o labirinto transformou-se num jardim mágico. Mas a saída foi selada por forças antigas. Recupera o Novelo de Ariadne, a Espada de Teseu e a Estátua de Dédalo para abrir o portal e escapar!"
    }
];

export function mostrarPaginaInstrucoes(pageIdx) {
    const page = INSTRUCTION_PAGES[pageIdx];
    if (!page) return;
    document.getElementById('papiro-titulo').textContent = page.titulo;
    document.getElementById('papiro-texto').innerHTML = `<p>${page.texto}</p>`;
    
    const btnAcao = document.getElementById('papiro-btn-acao');
    if (pageIdx < INSTRUCTION_PAGES.length - 1) {
        btnAcao.textContent = "Seguinte →";
    } else {
        btnAcao.textContent = "Começar a Explorar";
    }
}

export function abrirPapiroHistoria(id) {
    if (id === 'instructions') {
        S.setPapiroMode('instructions');
        S.setCurrentPapiroPage(0);
        mostrarPaginaInstrucoes(0);
        S.setPaused(true);
        document.exitPointerLock();
        document.getElementById('papiro-overlay').style.display = 'flex';
        return;
    }

    S.setPapiroMode('collectible');
    S.setIdHistoriaAtivaAtualmente(id);
    state.historiasColetadas[id] = true;
    
    // Change torches color based on collectible
    if (id === 1) { // espada
        import('./environment.js').then(env => env.setTorchesColor(0x00ffaa));
    } else if (id === 0) { // novelo
        import('./environment.js').then(env => env.setTorchesColor(0x00aaff));
    } else if (id === 2) { // estatua
        import('./environment.js').then(env => env.setTorchesColor(0xff55ff));
    }

    document.getElementById('papiro-titulo').textContent = DADOS_HISTORIAS[id].titulo;
    document.getElementById('papiro-texto').innerHTML = DADOS_HISTORIAS[id].texto;
    document.getElementById('papiro-btn-acao').textContent = "Compreendi o Enigma";
    
    const emojiSlot = document.getElementById(`emoji-slot-${id}`);
    if (emojiSlot) {
        emojiSlot.textContent = DADOS_HISTORIAS[id].emoji;
        emojiSlot.classList.add('coletado');
    }
    
    S.setPaused(true);
    document.exitPointerLock();
    document.getElementById('papiro-overlay').style.display = 'flex';
}

export function fecharPapiroImediato() {
    document.getElementById('papiro-overlay').style.display = 'none';
    S.setPaused(false);
    if (state.renderer && state.renderer.domElement) {
        state.renderer.domElement.requestPointerLock();
    }
    
    if (state.papiroMode === 'instructions') {
        if (state.papiroWhisp) {
            state.scene.remove(state.papiroWhisp);
            S.setPapiroWhisp(null);
        }
    }
}

export function avancarPapiro() {
    if (state.papiroMode === 'instructions') {
        const nextPage = state.currentPapiroPage + 1;
        if (nextPage < INSTRUCTION_PAGES.length) {
            S.setCurrentPapiroPage(nextPage);
            mostrarPaginaInstrucoes(nextPage);
        } else {
            fecharPapiroImediato();
        }
    } else {
        fecharPapiroImediato();
    }
}

export function fecharPapiro() {
    fecharPapiroImediato();
}

export function reverHistoria(id) {
    if (state.historiasColetadas[id]) {
        abrirPapiroHistoria(id);
    }
}

export function updateDebug() {
    const debugEl = document.getElementById('debug');
    if (!debugEl) return;
    const p = (state.playerPos && state.playerPos.lengthSq() > 0) ? state.playerPos : state.camera.position;
    const lockIcon = state.isLocked ? '✓' : '✗';
    const phase = state.currentPhase ? ` | ${state.currentPhase}` : '';
    const flyStatus = state.flyMode ? ' | VOO' : '';
    let yawDeg = (state.yaw * 180 / Math.PI) % 360;
    if (yawDeg < 0) yawDeg += 360;
    debugEl.textContent =
        `${state.cameraMode}${phase}${flyStatus} | X:${p.x.toFixed(2)}  Y:${p.y.toFixed(2)}  Z:${p.z.toFixed(2)} | Yaw:${yawDeg.toFixed(1)}° | Lock:${lockIcon}`;
}

export function showNotification(msg, duration = 4000) {
    const notif = document.getElementById('game-notification');
    if (!notif) return;
    notif.textContent = msg;
    notif.style.display = 'block';
    
    // Forçar reflow para ativar a transição
    notif.offsetHeight; 
    notif.style.opacity = '1';
    notif.style.transform = 'translate(-50%, -50%) scale(1)';
    
    if (notif.timeoutId) clearTimeout(notif.timeoutId);
    if (notif.fadeTimeoutId) clearTimeout(notif.fadeTimeoutId);
    
    notif.timeoutId = setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translate(-50%, -50%) scale(0.9)';
        notif.fadeTimeoutId = setTimeout(() => {
            notif.style.display = 'none';
        }, 400);
    }, duration);
}

export function abrirTeleporte() {
    const p = (state.playerPos && state.playerPos.lengthSq() > 0) ? state.playerPos : state.camera.position;
    document.getElementById('teleport-x').value = p.x.toFixed(1);
    document.getElementById('teleport-y').value = p.y.toFixed(1);
    document.getElementById('teleport-z').value = p.z.toFixed(1);
    
    S.setPaused(true);
    document.exitPointerLock();
    document.getElementById('teleport-overlay').style.display = 'flex';
    
    setTimeout(() => {
        const inputX = document.getElementById('teleport-x');
        if (inputX) {
            inputX.focus();
            inputX.select();
        }
    }, 100);
}

export function fecharTeleporte() {
    document.getElementById('teleport-overlay').style.display = 'none';
    S.setPaused(false);
    if (state.renderer && state.renderer.domElement) {
        state.renderer.domElement.requestPointerLock();
    }
}

export function confirmarTeleporte() {
    const xVal = parseFloat(document.getElementById('teleport-x').value);
    const yVal = parseFloat(document.getElementById('teleport-y').value);
    const zVal = parseFloat(document.getElementById('teleport-z').value);
    
    if (isNaN(xVal) || isNaN(yVal) || isNaN(zVal)) {
        showNotification("Erro: Coordenadas inválidas!");
        return;
    }
    
    state.playerPos.set(xVal, yVal, zVal);
    
    if (!state.flyMode) {
        S.setFlyMode(true);
        showNotification("Modo de voo ativado automaticamente!");
    }
    
    showNotification(`Teleportado para X:${xVal.toFixed(1)} Y:${yVal.toFixed(1)} Z:${zVal.toFixed(1)}`);
    fecharTeleporte();
}
