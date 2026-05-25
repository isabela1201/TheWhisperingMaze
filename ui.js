// ui.js
// Handles user interface components, notifications, papiros, and debug info

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
    if (renderer && renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
}

function reverHistoria(id) {
    if (historiasColetadas[id]) {
        abrirPapiroHistoria(id);
    }
}

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

function showNotification(msg, duration = 4000) {
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
