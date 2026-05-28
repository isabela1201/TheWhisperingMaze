// particles.js
// Handles optimized firefly (whispers) particle effects

const WHISPER_COUNT = 200; // Highly optimized (down from 200) for potato GPUs
const WHISPER_SPREAD = 60;

function createWhispers() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(WHISPER_COUNT * 3);
    const colors = new Float32Array(WHISPER_COUNT * 3);

    for (let i = 0; i < WHISPER_COUNT; i++) {
        const meta = {
            baseX: (Math.random() - 0.5) * WHISPER_SPREAD,
            baseY: 0.3 + Math.random() * 2.2,      // Height 0.3m to 2.5m
            baseZ: (Math.random() - 0.5) * WHISPER_SPREAD,
            phaseX: Math.random() * Math.PI * 2,    // Independent axis phase
            phaseY: Math.random() * Math.PI * 2,
            phaseZ: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,      // Floating speed
            life: Math.random() * 6,              // Staggered initial life to avoid pops
            maxLife: 4 + Math.random() * 4,        // Lives 4-8 seconds
            fadeIn: 0.8 + Math.random() * 0.8,     // Fade-in duration
            fadeOut: 0.8 + Math.random() * 0.8,     // Fade-out duration
        };
        whisperMeta.push(meta);

        positions[i * 3] = meta.baseX;
        positions[i * 3 + 1] = meta.baseY;
        positions[i * 3 + 2] = meta.baseZ;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0; // Starts invisible
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // Prevents sorting artifacts
    });

    whispers = new THREE.Points(geometry, material);
    scene.add(whispers);
}

function updateWhispers(t, delta) {
    if (!whispers) return;
    const positions = whispers.geometry.attributes.position.array;
    const colors = whispers.geometry.attributes.color.array;

    // Target color: soft greenish cyan
    const TR = 0.4, TG = 1.0, TB = 0.8;

    for (let i = 0; i < WHISPER_COUNT; i++) {
        const m = whisperMeta[i];
        m.life += delta;

        // Respawn: new random positions and properties when life finishes
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

        // Float motion using sine/cosine orbits
        const s = t * m.speed;
        positions[i * 3] = m.baseX + Math.sin(s + m.phaseX) * 0.4;
        positions[i * 3 + 1] = m.baseY + Math.sin(s * 0.6 + m.phaseY) * 0.18;
        positions[i * 3 + 2] = m.baseZ + Math.cos(s + m.phaseZ) * 0.4;

        // Brightness [0..1]: fade-in -> stable -> fade-out
        let brightness;
        if (m.life < m.fadeIn) brightness = m.life / m.fadeIn;
        else if (m.life > m.maxLife - m.fadeOut) brightness = (m.maxLife - m.life) / m.fadeOut;
        else brightness = 1.0;
        brightness = Math.max(0, Math.min(1, brightness));

        // Scale by whisper brightness multiplier (brighter at night)
        const b = brightness * whisperBrightnessMult;
        colors[i * 3] = TR * b;
        colors[i * 3 + 1] = TG * b;
        colors[i * 3 + 2] = TB * b;
    }

    whispers.geometry.attributes.position.needsUpdate = true;
    whispers.geometry.attributes.color.needsUpdate = true;
}
