// =============================================================================
// extras.js — Sistemas auxiliares: Partículas, Corpo do Jogador, Ciclo Dia/Noite
// =============================================================================

// --- PARTÍCULAS: BufferGeometry com ciclo de vida por partícula (Slides 06) ---
// Cada partícula tem metadados individuais (posição base, fase por eixo, velocidade,
// tempo de vida actual e máximo, durações de fade).
// Posições e cores guardadas em Float32Arrays tipados — estrutura de dados eficiente.
// Com AdditiveBlending, cor (0,0,0) = invisível → fade in/out via escala de cor.

function createWhispers() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(WHISPER_COUNT * 3);
    const colors = new Float32Array(WHISPER_COUNT * 3); // Atributo de cor por vértice

    for (let i = 0; i < WHISPER_COUNT; i++) {
        const meta = {
            baseX: (Math.random() - 0.5) * WHISPER_SPREAD,
            baseY: 0.3 + Math.random() * 2.2,      // altura 0.3 m a 2.5 m
            baseZ: (Math.random() - 0.5) * WHISPER_SPREAD,
            phaseX: Math.random() * Math.PI * 2,    // fase aleatória independente por eixo
            phaseY: Math.random() * Math.PI * 2,
            phaseZ: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,      // velocidade de flutuação
            life: Math.random() * 6,              // vida inicial escalonada (sem "pops" em simultâneo)
            maxLife: 4 + Math.random() * 4,        // vive 4–8 segundos
            fadeIn: 0.8 + Math.random() * 0.8,     // duração fade-in
            fadeOut: 0.8 + Math.random() * 0.8,     // duração fade-out
        };
        whisperMeta.push(meta);

        positions[i * 3] = meta.baseX;
        positions[i * 3 + 1] = meta.baseY;
        positions[i * 3 + 2] = meta.baseZ;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0; // começa invisível
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,            // cor lida do atributo 'color' por vértice
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,           // evita artefactos de ordenação com transparência
    });

    whispers = new THREE.Points(geometry, material);
    scene.add(whispers);
}

// --- FIX B: Corpo geométrico do jogador (Hierarquia de Objetos — Slides 03) ---
// Dois meshes independentes unidos num THREE.Group, que actua como pivot comum.
// Mover o Group move torso + cabeça juntos → demonstra transformação hierárquica.
function createPlayerBody() {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x8899bb,
        roughness: 0.85,
        metalness: 0.0
    });

    // Torso (cilindro)
    const torsoGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 12);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.castShadow = true;

    // Cabeça (esfera) — posição relativa ao Group, não ao mundo
    const headGeo = new THREE.SphereGeometry(0.25, 12, 8);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 0.75;
    head.castShadow = true;

    // Group = hierarquia: translação/rotação do Group afecta ambos os filhos
    playerBody = new THREE.Group();
    playerBody.add(torso);
    playerBody.add(head);
    scene.add(playerBody);
}

// --- ACTUALIZAÇÃO DAS PARTÍCULAS: flutuação sinusoidal + ciclo de vida ---
// Movimento: sin/cos com fase individual por eixo → flutuação orgânica, não tremor.
// Fade: brightness escala a cor alvo → com AdditiveBlending, preto = pixéis sem contribuição.
function updateWhispers(t, delta) {
    if (!whispers) return;
    const positions = whispers.geometry.attributes.position.array;
    const colors = whispers.geometry.attributes.color.array;

    // Cor alvo: ciano-esverdeado suave (0.4, 1.0, 0.8) ≈ #66ffcc
    const TR = 0.4, TG = 1.0, TB = 0.8;

    for (let i = 0; i < WHISPER_COUNT; i++) {
        const m = whisperMeta[i];
        m.life += delta;

        // Respawn: nova posição e novos parâmetros aleatórios quando a vida acaba
        if (m.life >= m.maxLife) {
            m.baseX = (Math.random() - 0.5) * WHISPER_SPREAD;
            m.baseY = 0.3 + Math.random() * 2.2;
            m.baseZ = (Math.random() - 0.5) * WHISPER_SPREAD;
            m.phaseX = Math.random() * Math.PI * 2;
            m.phaseY = Math.random() * Math.PI * 2;
            m.phaseZ = Math.random() * Math.PI * 2;
            m.speed = 0.3 + Math.random() * 0.5;
            m.life = 0;
            m.maxLife = 4 + Math.random() * 4;
            m.fadeIn = 0.8 + Math.random() * 0.8;
            m.fadeOut = 0.8 + Math.random() * 0.8;
        }

        // Flutuação suave: órbita elíptica com fase individual por eixo (Slides 03)
        const s = t * m.speed;
        positions[i * 3]     = m.baseX + Math.sin(s + m.phaseX) * 0.4;
        positions[i * 3 + 1] = m.baseY + Math.sin(s * 0.6 + m.phaseY) * 0.18;
        positions[i * 3 + 2] = m.baseZ + Math.cos(s + m.phaseZ) * 0.4;

        // Brightness [0..1]: fade-in → estável → fade-out
        let brightness;
        if (m.life < m.fadeIn) brightness = m.life / m.fadeIn;
        else if (m.life > m.maxLife - m.fadeOut) brightness = (m.maxLife - m.life) / m.fadeOut;
        else brightness = 1.0;
        brightness = Math.max(0, Math.min(1, brightness));

        // brightness × whisperBrightnessMult: pirilampos mais vivos de noite
        const b = brightness * whisperBrightnessMult;
        colors[i * 3]     = TR * b;
        colors[i * 3 + 1] = TG * b;
        colors[i * 3 + 2] = TB * b;
    }

    whispers.geometry.attributes.position.needsUpdate = true;
    whispers.geometry.attributes.color.needsUpdate = true;
}

// --- ANIMAÇÕES GERAIS (vento + delegar partículas) ---
function updateAnimations() {
    const t = clock.getElapsedTime();
    const delta = t - whisperPrevTime; // delta real em segundos desde o último frame
    whisperPrevTime = t;

    updateWhispers(t, delta);
    updateDayNight(t);     // ciclo dia/noite

    // Vegetação (Abanar com vento)
    vegetation.forEach(plant => {
        plant.rotation.z = Math.sin(t + plant.position.x) * 0.03;
    });
}

// === CICLO DIA/NOITE ============================================================
// 4 keyframes: Amanhecer → Meio-Dia → Pôr-do-Sol → Noite.
// Cada frame, LERP escalar e de cor entre o keyframe actual (A) e o seguinte (B).
// Demonstra: LERP (Slides 03), modelos de iluminação (Slides 05), HDR exposure.
function setupDayNightCycle() {
    DAY_PHASES = [
        { // 0 — Amanhecer: luz alaranjada baixa, sombras longas
            sunColor: new THREE.Color(0xff9944), sunIntensity: 0.7,
            sunPos: new THREE.Vector3(50, 12, 20),
            ambientColor: new THREE.Color(0xffcc88), ambientIntensity: 0.2,
            hemiSky: new THREE.Color(0xffddaa), hemiGround: new THREE.Color(0x554433),
            fogColor: new THREE.Color(0xffccaa), fogNear: 6, fogFar: 45,
            exposure: 0.7, mazeEmissive: 0.0, whisperMult: 0.8,
        },
        { // 1 — Meio-dia: luz branca forte, sombras curtas
            sunColor: new THREE.Color(0xfff8f0), sunIntensity: 1.6,
            sunPos: new THREE.Vector3(2, 65, 5),
            ambientColor: new THREE.Color(0xe0f0ff), ambientIntensity: 0.55,
            hemiSky: new THREE.Color(0xbbdeff), hemiGround: new THREE.Color(0x77bb77),
            fogColor: new THREE.Color(0xd0eaff), fogNear: 9, fogFar: 72,
            exposure: 0.9, mazeEmissive: 0.0, whisperMult: 0.5,
        },
        { // 2 — Pôr-do-Sol: laranja avermelhado, atmosfera quente
            sunColor: new THREE.Color(0xff5522), sunIntensity: 0.6,
            sunPos: new THREE.Vector3(-50, 10, 20),
            ambientColor: new THREE.Color(0xcc7755), ambientIntensity: 0.18,
            hemiSky: new THREE.Color(0xff8866), hemiGround: new THREE.Color(0x442211),
            fogColor: new THREE.Color(0xcc9977), fogNear: 5, fogFar: 38,
            exposure: 0.65, mazeEmissive: 0.06, whisperMult: 1.2,
        },
        { // 3 — Noite: luz de lua azulada, névoa densa, pedras com brilho próprio
            sunColor: new THREE.Color(0x334488), sunIntensity: 0.12,
            sunPos: new THREE.Vector3(5, 35, -30),
            ambientColor: new THREE.Color(0x0a1530), ambientIntensity: 0.12,
            hemiSky: new THREE.Color(0x0a1530), hemiGround: new THREE.Color(0x000810),
            fogColor: new THREE.Color(0x05101a), fogNear: 3, fogFar: 20,
            exposure: 0.45, mazeEmissive: 0.18, whisperMult: 2.0,
        },
    ];
}

function updateDayNight(t) {
    if (!DAY_PHASES || !sunLight) return;
    const n = (t % DAY_CYCLE_DURATION) / DAY_CYCLE_DURATION; // 0..1
    const f = n * DAY_PHASES.length;
    const i = Math.floor(f) % DAY_PHASES.length;
    const j = (i + 1) % DAY_PHASES.length;
    const lf = f - Math.floor(f);                              // 0..1 dentro do segmento
    const A = DAY_PHASES[i], B = DAY_PHASES[j];
    const ls = (a, b) => a + (b - a) * lf;                    // LERP escalar

    currentPhase = DAY_PHASE_NAMES[i];

    // Sol / Lua — cor, intensidade e posição (sombras mudam de direção ao longo do dia)
    sunLight.color.copy(A.sunColor).lerp(B.sunColor, lf);
    sunLight.intensity = ls(A.sunIntensity, B.sunIntensity);
    sunLight.position.lerpVectors(A.sunPos, B.sunPos, lf);

    // Luz ambiente
    ambientLight.color.copy(A.ambientColor).lerp(B.ambientColor, lf);
    ambientLight.intensity = ls(A.ambientIntensity, B.ambientIntensity);

    // Hemisférica (céu + chão)
    hemiLight.color.copy(A.hemiSky).lerp(B.hemiSky, lf);
    hemiLight.groundColor.copy(A.hemiGround).lerp(B.hemiGround, lf);

    // Fog + céu (near/far mudam: dia tem alcance maior, noite é mais densa)
    scene.fog.color.copy(A.fogColor).lerp(B.fogColor, lf);
    scene.fog.near = ls(A.fogNear, B.fogNear);
    scene.fog.far = ls(A.fogFar, B.fogFar);
    scene.background.copy(A.fogColor).lerp(B.fogColor, lf);

    // HDR Tone Mapping Exposure (Slides 05): mais escuro de noite
    renderer.toneMappingExposure = ls(A.exposure, B.exposure);

    // Emissive dos materiais: pedras do labirinto brilham suavemente à noite
    const emissive = ls(A.mazeEmissive, B.mazeEmissive);
    mazeMaterials.forEach(mat => { mat.emissiveIntensity = emissive; });

    // Multiplicador de brilho dos pirilampos
    whisperBrightnessMult = ls(A.whisperMult, B.whisperMult);

    // Ambiente do céu, estrelas e nuvens
    SkyEnvironment.update(n, sunLight.position);
}
