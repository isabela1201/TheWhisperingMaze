// sky.js
// Ambiente celestial dinâmico com Sol, Lua, Estrelas e Nuvens Processuais

const SkyEnvironment = {
    skyGroup: null,
    sunGroup: null,   
    moonGroup: null,
    stars: null,
    clouds: [],
    cloudMats: [],

    init: function (scene) {
        // Grupo que contém todos os elementos celestes
        this.skyGroup = new THREE.Group();
        scene.add(this.skyGroup);

        // --- SOL ---
        this.sunGroup = new THREE.Group();
        this.skyGroup.add(this.sunGroup);

        // Esfera principal do sol
        const sunGeom = new THREE.IcosahedronGeometry(18, 2);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, fog: false });
        const sunMesh = new THREE.Mesh(sunGeom, sunMat);
        this.sunGroup.add(sunMesh);

        // Brilho do sol (Additive blending para glow top)
        const sunGlowGeom = new THREE.IcosahedronGeometry(22, 2);
        const sunGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff9900,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            fog: false
        });
        const sunGlow = new THREE.Mesh(sunGlowGeom, sunGlowMat);
        this.sunGroup.add(sunGlow);

        // --- LUA ---
        this.moonGroup = new THREE.Group();
        this.skyGroup.add(this.moonGroup);

        // Esfera perfeita 
        const moonGeom = new THREE.SphereGeometry(14, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xeef4ff, fog: false });
        const moonMesh = new THREE.Mesh(moonGeom, moonMat);
        this.moonGroup.add(moonMesh);

        // Glow da Lua (para iluminar)
        const moonGlowGeom = new THREE.SphereGeometry(18, 16, 16);
        const moonGlowMat = new THREE.MeshBasicMaterial({
            color: 0xaaccff,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            fog: false
        });
        const moonGlow = new THREE.Mesh(moonGlowGeom, moonGlowMat);
        this.moonGroup.add(moonGlow);

        // --- ESTRELAS ---
        const starGeom = new THREE.BufferGeometry();
        const starCount = 600;
        const starPos = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            let r = 250 + Math.random() * 150;
            let theta = Math.random() * Math.PI * 2;
            let phi = Math.random() * Math.PI;

            starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = r * Math.cos(phi);
            starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }

        starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2.0,
            transparent: true,
            opacity: 0,
            fog: false
        });

        this.stars = new THREE.Points(starGeom, starMat);
        this.skyGroup.add(this.stars);

        // --- NUVENS (Processuais Baseadas no código no pdf do Josh Marinacci) ---
        
        // Funções de formatação usando BufferGeometry
        const map = (val, smin, smax, emin, emax) => (emax - emin) * (val - smin) / (smax - smin) + emin;

        const jitter = (geo, per) => {
            const pos = geo.attributes.position;
            for(let i=0; i < pos.count; i++) {
                const vx = pos.getX(i) + map(Math.random(), 0, 1, -per, per);
                const vy = pos.getY(i) + map(Math.random(), 0, 1, -per, per);
                const vz = pos.getZ(i) + map(Math.random(), 0, 1, -per, per);
                pos.setXYZ(i, vx, vy, vz);
            }
        };

        const chopBottom = (geo, bottom) => {
            const pos = geo.attributes.position;
            for(let i=0; i < pos.count; i++) {
                const vy = Math.max(pos.getY(i), bottom);
                pos.setY(i, vy);
            }
        };

        // 3 esferas como o pdf ensina
        const cloudGeoms = [];
        
        const tuft1 = new THREE.SphereGeometry(1.5, 7, 8);
        tuft1.translate(-2, 0, 0);
        cloudGeoms.push(tuft1);

        const tuft2 = new THREE.SphereGeometry(1.5, 7, 8);
        tuft2.translate(2, 0, 0);
        cloudGeoms.push(tuft2);

        const tuft3 = new THREE.SphereGeometry(2.0, 7, 8);
        tuft3.translate(0, 0, 0);
        cloudGeoms.push(tuft3);

    
        cloudGeoms.forEach(geo => {
            jitter(geo, 0.2);
            chopBottom(geo, -0.5);
            geo.computeVertexNormals(); 
        });
        
        for (let i = 0; i < 30; i++) {
            const cloudGroup = new THREE.Group();
            
            // manter as cores originais do projeto
            const mat = new THREE.MeshLambertMaterial({
                color: 'white',
                emissive: 0xa1b7e3, 
                flatShading: true,
                transparent: true,
                opacity: 0.9,
                fog: false
            });
            this.cloudMats.push(mat);

            cloudGeoms.forEach(geo => {
                const mesh = new THREE.Mesh(geo, mat);
                cloudGroup.add(mesh);
            });

            // Dar grandes variações de escala às nuvens como querias anteriormente
            const globalScale = 4.0 + Math.random() * 6.0; 
            cloudGroup.scale.set(globalScale, globalScale, globalScale);

            // rodar as nuvens em Y 
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;

            cloudGroup.position.set(
                (Math.random() - 0.5) * 800,
                70 + Math.random() * 130, // Alturas variadas
                (Math.random() - 0.5) * 800
            );

            this.skyGroup.add(cloudGroup);
            this.clouds.push({ 
                group: cloudGroup, 
                speed: (0.2 + Math.random() * 0.3) / globalScale // Vento consoante tamanho e peso
            });
        }
    },

    update: function (n, lightDir) {
        if (!this.skyGroup) return;

        const R = 300;
        
        // Usar órbita matemática perfeita baseada no n (0..1)
        // Para que o Sol e a Lua rodem no sentido -X para +X, construímos um ângulo.
        const angle = n * Math.PI * 2;
        
        // Posição do Sol
        // n=0 (Amanhecer): começa em -X (esquerda).
        // n=0.25 (Meio-dia): topo em +Y.
        // n=0.5 (Pôr-do-sol): acaba em +X (direita).
        const sunX = -Math.cos(angle) * R;
        const sunY = Math.sin(angle) * R;
        const Z = 20; 
        
        this.sunGroup.position.set(sunX, sunY, Z);
        this.sunGroup.lookAt(0, 0, 0);

        // Posição da Lua (Exatamente o oposto do Sol)
        const moonAngle = angle + Math.PI;
        const moonX = -Math.cos(moonAngle) * R;
        const moonY = Math.sin(moonAngle) * R;
        
        this.moonGroup.position.set(moonX, moonY, -Z);
        this.moonGroup.lookAt(0, 0, 0);

        // --- FADE E ANIMAÇÕES ---
        let nightVal = Math.cos((n - 0.75) * Math.PI * 2);
        nightVal = Math.max(0, nightVal);
        const nightFactor = Math.pow(nightVal, 1.5);

        this.stars.material.opacity = nightFactor * 0.95;

        // Estrelas rodam rigorosamente de acordo com a mesma fórmula orbital
        this.stars.rotation.z = -angle;

        // --- ANIMAÇÃO DAS NUVENS ---
        const dayColor = new THREE.Color(0xffffff);
        const nightColor = new THREE.Color(0x3a4b6b);
        const dayEmissive = new THREE.Color(0x000000);
        const nightEmissive = new THREE.Color(0x1a2b4a);

        this.clouds.forEach((c, idx) => {
            c.group.position.x -= c.speed;

            if (c.group.position.x < -400) {
                c.group.position.x = 400;
                c.group.position.z = (Math.random() - 0.5) * 800;
                c.group.position.y = 70 + Math.random() * 130;
            }

            const mat = this.cloudMats[idx];
            mat.color.copy(dayColor).lerp(nightColor, nightFactor);
            mat.emissive.copy(dayEmissive).lerp(nightEmissive, nightFactor);
            mat.opacity = 0.9 - (nightFactor * 0.2); 
        });
    }
};
