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
// Vários meshes independentes (tronco, toga, cabeça, cabelo, barba, braços e pernas)
// unidos num THREE.Group com articulações (Joints) para podermos simular animações.
function createPlayerBody() {
    // Materiais PBR com Flat Shading para o look low-poly
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xdca889, // Tom de pele mediterrânico bronzeado
        roughness: 0.8,
        metalness: 0.05,
        flatShading: true
    });

    const togaMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5fa, // Toga branca
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true
    });

    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x1a1513, // Cabelo escuro (castanho quase preto)
        roughness: 0.85,
        metalness: 0.0,
        flatShading: true
    });

    const leatherMat = new THREE.MeshStandardMaterial({
        color: 0x4a3225, // Sandálias / Cinto de couro
        roughness: 0.9,
        metalness: 0.0,
        flatShading: true
    });

    playerBody = new THREE.Group();

    // --- ARTICULAÇÕES (Joints) ---
    
    // 1. Articulações das Coxas (Hip Joints) - Pivot no topo da coxa: y = 0.675
    const leftLegJoint = new THREE.Group();
    leftLegJoint.position.set(-0.14, 0.675, 0);
    playerBody.add(leftLegJoint);
    playerBody.leftLegJoint = leftLegJoint;

    const rightLegJoint = new THREE.Group();
    rightLegJoint.position.set(0.14, 0.675, 0);
    playerBody.add(rightLegJoint);
    playerBody.rightLegJoint = rightLegJoint;

    // 2. Articulações dos Ombros (Shoulder Joints)
    const leftArmJoint = new THREE.Group();
    leftArmJoint.position.set(-0.23, 1.48, 0);
    leftArmJoint.rotation.set(0.05, 0, 0.12); // Posição de repouso
    playerBody.add(leftArmJoint);
    playerBody.leftArmJoint = leftArmJoint;

    const rightArmJoint = new THREE.Group();
    rightArmJoint.position.set(0.24, 1.48, 0);
    rightArmJoint.rotation.set(0.05, 0, -0.15); // Posição de repouso
    playerBody.add(rightArmJoint);
    playerBody.rightArmJoint = rightArmJoint;

    // 3. Articulações dos Cotovelos (Elbow Joints)
    const leftElbowJoint = new THREE.Group();
    leftElbowJoint.position.set(0, -0.3, 0.02);
    leftElbowJoint.rotation.set(0.1, 0, 0);
    leftArmJoint.add(leftElbowJoint);
    playerBody.leftElbowJoint = leftElbowJoint;

    const rightElbowJoint = new THREE.Group();
    rightElbowJoint.position.set(0, -0.35, 0.02);
    rightElbowJoint.rotation.set(0.1, 0, 0);
    rightArmJoint.add(rightElbowJoint);
    playerBody.rightElbowJoint = rightElbowJoint;

    // --- MESHES ASSOCIADAS ---

    // Pernas (Cilindros deslocados para baixo do pivot)
    const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.65, 5);
    
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(0, -0.325, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLegJoint.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0, -0.325, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLegJoint.add(rightLeg);

    // Sandálias
    const footGeo = new THREE.BoxGeometry(0.09, 0.07, 0.18);
    
    const leftFoot = new THREE.Mesh(footGeo, leatherMat);
    leftFoot.position.set(0, -0.64, 0.04);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    leftLegJoint.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, leatherMat);
    rightFoot.position.set(0, -0.64, 0.04);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    rightLegJoint.add(rightFoot);

    // Braços (Cilindros deslocados para baixo do ombro/cotovelo)
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.3, 5), skinMat);
    leftUpperArm.position.set(0, -0.15, 0);
    leftUpperArm.castShadow = true;
    leftArmJoint.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 5), skinMat);
    leftForearm.position.set(0, -0.16, 0.02);
    leftForearm.castShadow = true;
    leftElbowJoint.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), skinMat);
    leftHand.position.set(0, -0.32, 0.04);
    leftHand.castShadow = true;
    leftElbowJoint.add(leftHand);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 5), skinMat);
    rightUpperArm.position.set(0, -0.175, 0);
    rightUpperArm.castShadow = true;
    rightArmJoint.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 5), skinMat);
    rightForearm.position.set(0, -0.16, 0.02);
    rightForearm.castShadow = true;
    rightElbowJoint.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), skinMat);
    rightHand.position.set(0, -0.32, 0.04);
    rightHand.castShadow = true;
    rightElbowJoint.add(rightHand);
    playerBody.rightHand = rightHand; // Guardar referência para o SpotLight em game.js

    // Tocha geométrica low poly na mão direita
    const torchMesh = new THREE.Group();
    
    const torchHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.015, 0.25, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a2e15, roughness: 0.9, flatShading: true })
    );
    torchHandle.position.y = 0.125;
    torchHandle.castShadow = true;
    torchMesh.add(torchHandle);

    const torchFlame = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.05, 0),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff5500, emissiveIntensity: 1, flatShading: true })
    );
    torchFlame.position.y = 0.27;
    torchMesh.add(torchFlame);

    // Posicionar a tocha na mão
    torchMesh.position.copy(rightHand.position);
    torchMesh.rotation.x = Math.PI / 2.5; // Inclinada para a frente
    rightElbowJoint.add(torchMesh);
    playerBody.torchMesh = torchMesh;

    // --- ELEMENTOS DO CORPO CENTRAL ---

    // Saia da Toga
    const skirtGeo = new THREE.CylinderGeometry(0.21, 0.25, 0.65, 6);
    const skirt = new THREE.Mesh(skirtGeo, togaMat);
    skirt.position.set(0, 0.9, 0);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    playerBody.add(skirt);

    // Pregas na parte de trás da saia da toga
    const foldGeo = new THREE.BoxGeometry(0.05, 0.62, 0.04);
    
    const skirtFoldL = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldL.position.set(-0.1, 0.9, -0.19);
    skirtFoldL.rotation.set(0.05, 0.1, 0.05);
    skirtFoldL.castShadow = true;
    playerBody.add(skirtFoldL);

    const skirtFoldR = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldR.position.set(0.1, 0.9, -0.19);
    skirtFoldR.rotation.set(0.05, -0.1, -0.05);
    skirtFoldR.castShadow = true;
    playerBody.add(skirtFoldR);

    const skirtFoldC = new THREE.Mesh(foldGeo, togaMat);
    skirtFoldC.position.set(0, 0.9, -0.21);
    skirtFoldC.rotation.set(0.05, 0, 0);
    skirtFoldC.castShadow = true;
    playerBody.add(skirtFoldC);

    // Torso (Pele)
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.45, 6);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.set(0, 1.35, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    playerBody.add(torso);
    playerBody.torso = torso;

    // Alça da Toga (Ajuste: mais baixa conforme feedback)
    const shoulderToga = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.24), togaMat);
    shoulderToga.position.set(-0.15, 1.40, 0);
    shoulderToga.rotation.set(0, 0, 0.15);
    shoulderToga.castShadow = true;
    playerBody.add(shoulderToga);

    // Pregas diagonais (Costas e Frente)
    const backFold1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.05), togaMat);
    backFold1.position.set(-0.06, 1.32, -0.07);
    backFold1.rotation.set(0.1, 0.0, -0.45);
    backFold1.castShadow = true;
    playerBody.add(backFold1);

    const backFold2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), togaMat);
    backFold2.position.set(-0.01, 1.28, -0.08);
    backFold2.rotation.set(0.15, 0.1, -0.42);
    backFold2.castShadow = true;
    playerBody.add(backFold2);

    const frontFold1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.05), togaMat);
    frontFold1.position.set(-0.06, 1.32, 0.07);
    frontFold1.rotation.set(-0.1, 0.0, 0.45);
    frontFold1.castShadow = true;
    playerBody.add(frontFold1);

    // Cinto
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 6), leatherMat);
    belt.position.set(0, 1.15, 0);
    belt.castShadow = true;
    playerBody.add(belt);

    // Pescoço
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 5), skinMat);
    neck.position.set(0, 1.58, 0);
    neck.castShadow = true;
    neck.receiveShadow = true;
    playerBody.add(neck);

    // Cabeça
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), skinMat);
    head.position.set(0, 1.69, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    playerBody.add(head);

    // Cabelo
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), hairMat);
    hairTop.position.set(0, 1.77, -0.02);
    hairTop.scale.set(1.15, 0.85, 1.15);
    hairTop.castShadow = true;
    playerBody.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.09), hairMat);
    hairBack.position.set(0, 1.71, -0.1);
    hairBack.rotation.set(-0.1, 0, 0);
    hairBack.castShadow = true;
    playerBody.add(hairBack);

    const sideburnL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.07), hairMat);
    sideburnL.position.set(-0.11, 1.68, -0.02);
    sideburnL.castShadow = true;
    playerBody.add(sideburnL);

    const sideburnR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.07), hairMat);
    sideburnR.position.set(0.11, 1.68, -0.02);
    sideburnR.castShadow = true;
    playerBody.add(sideburnR);

    // Barba
    const beardJaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.11), hairMat);
    beardJaw.position.set(0, 1.61, 0.04);
    beardJaw.rotation.set(0.1, 0, 0);
    beardJaw.castShadow = true;
    playerBody.add(beardJaw);

    playerBody.visible = false;
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

// --- ANIMAÇÃO DE CAMINHADA PROCEDIMENTAL (Walk Cycle) ---
// Roda as pernas e braços em oposição ao andar e lerpa suavemente de volta ao repouso se parado.
let walkTimer = 0;

function updatePlayerAnimation(delta) {
    if (!playerBody || !playerBody.visible) return;

    // Mostrar/esconder tocha low poly conforme o estado
    if (typeof torchOn !== 'undefined' && playerBody.torchMesh) {
        playerBody.torchMesh.visible = torchOn;
    }

    // Detetar se o modo de voo está ativo
    const isFlying = typeof flyMode !== 'undefined' && flyMode;

    // Detetar se o jogador está a mover-se pelas teclas WASD (declaradas globalmente em game.js)
    const isMoving = typeof KEY !== 'undefined' && (KEY.w || KEY.s || KEY.a || KEY.d);

    // Ajustes de velocidade e amplitude baseado se está a correr
    const isSprinting = typeof KEY !== 'undefined' && KEY.shift;
    const swingSpeed = isSprinting ? 12 : 8.5;
    const maxLegSwing = isSprinting ? 0.65 : 0.42;
    const maxArmSwing = isSprinting ? 0.55 : 0.35;

    if (isFlying) {
        // Animação de flutuação suave no ar
        const floatTime = clock.getElapsedTime() * 2.0; // freq suave
        
        // Posição de pernas relaxadas (ligeiramente inclinadas para trás)
        const targetLegRot = 0.15 + Math.sin(floatTime) * 0.05;
        playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftLegJoint.rotation.x, targetLegRot, 0.1);
        playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightLegJoint.rotation.x, targetLegRot - 0.05, 0.1);

        // Braços ligeiramente abertos para os lados e a flutuar
        const targetArmRotX = 0.2 + Math.cos(floatTime) * 0.08;
        const targetArmRotZLeft = 0.3 + Math.sin(floatTime) * 0.05;
        const targetArmRotZRight = -0.3 - Math.sin(floatTime) * 0.05;

        playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.x, targetArmRotX, 0.1);
        playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.x, targetArmRotX, 0.1);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, targetArmRotZLeft, 0.1);
        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, targetArmRotZRight, 0.1);

        // Cotovelos relaxados
        playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftElbowJoint.rotation.x, 0.25, 0.1);
        playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightElbowJoint.rotation.x, 0.25, 0.1);

        playerBody.torso.rotation.y = THREE.MathUtils.lerp(playerBody.torso.rotation.y, 0, 0.1);
    } else if (isMoving) {
        walkTimer += delta * swingSpeed;
        
        // Oscilar coxas/pernas (eixo X)
        playerBody.leftLegJoint.rotation.x = Math.sin(walkTimer) * maxLegSwing;
        playerBody.rightLegJoint.rotation.x = -Math.sin(walkTimer) * maxLegSwing;

        // Oscilar braços no ombro (oposto às pernas)
        playerBody.rightArmJoint.rotation.x = 0.05 + Math.sin(walkTimer) * maxArmSwing;
        playerBody.leftArmJoint.rotation.x = 0.05 - Math.sin(walkTimer) * maxArmSwing;

        // LERP braços em Z de volta à posição de repouso ao andar
        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, -0.15, 0.1);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, 0.12, 0.1);

        // Oscilar a dobra dos cotovelos (aumenta o dinamismo)
        playerBody.rightElbowJoint.rotation.x = 0.1 + (Math.sin(walkTimer + Math.PI/2) * 0.15 + 0.15);
        playerBody.leftElbowJoint.rotation.x = 0.1 + (Math.sin(-walkTimer + Math.PI/2) * 0.15 + 0.15);

        // Ligeira torção no tronco/ancas
        playerBody.torso.rotation.y = Math.sin(walkTimer) * 0.06;
    } else {
        // LERP suave de volta à posição neutra/idle
        const lerpFactor = 0.18;
        playerBody.leftLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftLegJoint.rotation.x, 0, lerpFactor);
        playerBody.rightLegJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightLegJoint.rotation.x, 0, lerpFactor);
        
        playerBody.rightArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.x, 0.05, lerpFactor);
        playerBody.leftArmJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.x, 0.05, lerpFactor);

        playerBody.rightArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.rightArmJoint.rotation.z, -0.15, lerpFactor);
        playerBody.leftArmJoint.rotation.z = THREE.MathUtils.lerp(playerBody.leftArmJoint.rotation.z, 0.12, lerpFactor);

        playerBody.rightElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.rightElbowJoint.rotation.x, 0.1, lerpFactor);
        playerBody.leftElbowJoint.rotation.x = THREE.MathUtils.lerp(playerBody.leftElbowJoint.rotation.x, 0.1, lerpFactor);

        playerBody.torso.rotation.y = THREE.MathUtils.lerp(playerBody.torso.rotation.y, 0, lerpFactor);
    }
}

// --- ANIMAÇÕES GERAIS (vento + delegar partículas) ---
function updateAnimations() {
    const t = clock.getElapsedTime();
    const delta = t - whisperPrevTime; // delta real em segundos desde o último frame
    whisperPrevTime = t;

    updateWhispers(t, delta);
    updateDayNight(t);           // ciclo dia/noite
    updatePlayerAnimation(delta); // animação procedimental do boneco

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
