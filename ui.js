// ui.js
// Handles user interface components: notifications, papiros, and story progression

import * as state from './state.js';
import { S } from './state.js';
import { DADOS_HISTORIAS, INSTRUCTION_PAGES } from './config.js';

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

    // Change wall torch colour based on which collectible was picked up
    if (id === 0) {
        import('./environment.js').then(env => env.setTorchesColor(0x00aaff)); // novelo → azul
    } else if (id === 1) {
        import('./environment.js').then(env => env.setTorchesColor(0x00ffaa)); // espada → verde
    } else if (id === 2) {
        import('./environment.js').then(env => env.setTorchesColor(0xff55ff)); // estátua → rosa
    }

    document.getElementById('papiro-titulo').textContent = DADOS_HISTORIAS[id].titulo;
    document.getElementById('papiro-texto').innerHTML = DADOS_HISTORIAS[id].texto;
    document.getElementById('papiro-btn-acao').textContent = "Avançar";

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

export function showNotification(msg, duration = 4000) {
    const notif = document.getElementById('game-notification');
    if (!notif) return;
    notif.textContent = msg;
    notif.style.display = 'block';

    // Force reflow to trigger the CSS transition
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
