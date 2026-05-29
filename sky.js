// sky.js
// Ambiente celestial dinâmico com Sol, Lua, Estrelas e Nuvens Processuais

import * as THREE from 'three';
import * as state from './state.js';

export const SkyEnvironment = {
    skyGroup: null,
    sunGroup: null,   
    moonGroup: null,
    stars: null,
    clouds: [],
    cloudMats: [],
    // Refs antigas e do PNG removidas
    moonGlowMat: null, // ref para animar opacidade do brilho da lua
    moonMeshMat: null, // ref para controlar a opacidade da base da lua

    init: function (scene) {
        // Grupo que contém todos os elementos celestes
        this.skyGroup = new THREE.Group();
        scene.add(this.skyGroup);

        // --- SOL ---
        this.sunGroup = new THREE.Group();
        this.skyGroup.add(this.sunGroup);

        // Esfera principal do sol (base de cor)
        const sunGeom = new THREE.IcosahedronGeometry(18, 2);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, fog: false });
        const sunMesh = new THREE.Mesh(sunGeom, sunMat);
        this.sunGroup.add(sunMesh);

        // Brilho do sol (Additive blending para glow)
        const sunGlowGeom = new THREE.IcosahedronGeometry(22, 2);
        const sunGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff9900,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        const sunGlow = new THREE.Mesh(sunGlowGeom, sunGlowMat);
        this.sunGroup.add(sunGlow);

        // --- LUA (Grupo principal de órbita - RESTAURADO SÍNCRONO) ---
        this.moonGroup = new THREE.Group();
        this.skyGroup.add(this.moonGroup);

        // [RESTAURADO E REDUZIDO] Esfera perfeita síncrona
        // Tamanho reduzido para raio 10 (era 14 no antigo e 120 no PNG)
        const moonGeom = new THREE.SphereGeometry(10, 32, 32); 
        this.moonMeshMat = new THREE.MeshBasicMaterial({ 
            color: 0xeef4ff, 
            transparent: true,
            opacity: 0, // Iniciado em 0, controlado dinamicamente no update
            fog: false 
        });
        const moonMesh = new THREE.Mesh(moonGeom, this.moonMeshMat);
        this.moonGroup.add(moonMesh);

        // [RESTAURADO E REDUZIDO] Brilho síncrono da Lua
        // Tamanho reduzido para raio 13 para abraçar a esfera
        const moonGlowGeom = new THREE.SphereGeometry(13, 16, 16); 
        this.moonGlowMat = new THREE.MeshBasicMaterial({
            color: 0xaaccff,
            transparent: true,
            opacity: 0, // Iniciado em 0, controlado dinamicamente no update
            blending: THREE.AdditiveBlending,
            // SEM depthTest: false para evitar o orbe transparente desfocado
            depthWrite: false, 
            fog: false
        });
        const moonGlow = new THREE.Mesh(moonGlowGeom, this.moonGlowMat);
        this.moonGroup.add(moonGlow);

        // Toda a secção de carregar o PNG (assets/sky/lua.png) foi removida.

        // --- ESTRELAS ---
        const starGeom = new THREE.BufferGeometry();
        const starCount = 250;
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

        // --- NUVENS PROCESSUAIS ---
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
        
        for (let i = 0; i < 12; i++) {
            const cloudGroup = new THREE.Group();
            
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

            const globalScale = 4.0 + Math.random() * 6.0; 
            cloudGroup.scale.set(globalScale, globalScale, globalScale);
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;

            cloudGroup.position.set(
                (Math.random() - 0.5) * 800,
                70 + Math.random() * 130, 
                (Math.random() - 0.5) * 800
            );

            this.skyGroup.add(cloudGroup);
            this.clouds.push({ 
                group: cloudGroup, 
                speed: (0.2 + Math.random() * 0.3) / globalScale 
            });
        }
    },

    update: function (n, lightDir) {
        if (!this.skyGroup) return;
        
        // Centrar o skyGroup na câmara
        if (state.camera) {
            this.skyGroup.position.copy(state.camera.position);
        }

        const R = 300;
        const angle = n * Math.PI * 2;
        
        // Posição do Sol
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
        this.stars.rotation.z = -angle;

        // [MODIFICADO] A secção de actualizar o PlaneGeometry do PNG foi removida.

        // [MODIFICADO] Controlar a opacidade da esfera sólida síncrona
        if (this.moonMeshMat) {
            this.moonMeshMat.opacity = nightFactor;
        }

        // [MODIFICADO] Controlar a opacidade do brilho síncrono
        if (this.moonGlowMat) {
            this.moonGlowMat.opacity = nightFactor * 0.35;
        }

        // --- ANIMAÇÃO E CORES DAS NUVENS ---
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