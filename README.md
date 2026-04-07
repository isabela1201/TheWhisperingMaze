# TheWhisperingMaze
Projeto para a cadeira de ICG e consiste no desenvolvimento de um jogo 3D interativo de exploração na primeira pessoa, situado num labirinto que funciona também como um jardim encantado. Inspirado na Lenda de Creta.


## Conceito e História

> *Teseu derrotou o Minotauro. Agora tem de sair do labirinto.*
> *Mas o labirinto transformou-se - o sangue do Minotauro fertilizou as pedras, e um jardim nasceu entre as muralhas.*
> *Recolhe os teus artefactos perdidos na batalha e abre a porta da saída.*


---
## Como Jogar

| Tecla | Ação |
|---|---|
| `W A S D` | Mover |
| `Rato` | Olhar em volta |
| `Shift` | Correr |
| `F` | Ligar/desligar lanterna |
| `C` | Alternar câmara FPS / TPS |

**Objetivo:** Explora o labirinto, recolhe os **3 artefactos de Teseu** e abre a porta da saída. (ainda em desenvolvimento!)


## Funcionalidades Implementadas

### 🌅 Ciclo Dia/Noite Dinâmico
Sistema de 4 keyframes interpolados com LERP:
- **Amanhecer** → luz alaranjada, fog quente
- **Meio-Dia** → luz branca intensa, sombras curtas
- **Pôr-do-Sol** → luz avermelhada, atmosfera quente
- **Noite** → luz azulada de lua, névoa densa, pedras com brilho emissivo

Todos os valores de luz, cor do céu, fog e HDR exposure são interpolados suavemente frame a frame.

### 🌌 Céu Procedural (`sky.js`)
- **Sol**: esfera `IcosahedronGeometry` amarela com glow de blending aditivo
- **Lua**: esfera perfeita (`SphereGeometry`) com aura ciano
- **Estrelas**: sistema de `THREE.Points` com 600 partículas, fade-in/out baseado na hora do dia
- **Nuvens**: geometria procedural baseada no tutorial *"Low Poly Clouds"* de Josh Marinacci — 3 esferas fundidas com *jitter* de vértices e base achatada (`chopBottom`)

### 🔦 Lanterna (`SpotLight`)
- Cone de luz direcional com atenuação quadrática `decay: 2` (1/d²)
- Piscar com ruído de frequência dupla: `sin(t×6.3) + sin(t×17.7)` — simula chama instável
- Toggle com tecla `F`

### 🌿 Pirilampos / Whispers
- Sistema de 200 partículas com `BufferGeometry` e `Float32Array`
- Cada partícula tem metadados individuais: posição base, fase, velocidade, tempo de vida, fade-in/out
- Flutuação orgânica com sin/cos de fase independente por eixo (não tremor aleatório)
- Pirilampos ficam mais brilhantes à noite (multiplicador sincronizado com o ciclo dia/noite)

### 📷 Câmaras FPS / TPS
- **FPS**: câmara posicionada nos "olhos" do jogador com controlo direto
- **TPS**: câmara orbita atrás/acima com colisão própria (Raycaster aplicado ao frustum)
- Mudança de FOV ao alternar (75° FPS → 65° TPS) com `updateProjectionMatrix()`
- Toggle com tecla `C`

### 🧱 Colisão via Raycaster
Dois raios independentes por eixo (X e Z) disparados a partir da posição do jogador. Separar os eixos permite deslizar ao longo das paredes em vez de parar completamente.

### 🎨 Materiais PBR
- `MeshStandardMaterial` com `roughness`, `metalness`, `normalMap`, `emissive`
- Anisotropia máxima nas texturas (`getMaxAnisotropy()`)
- Mipmapping trilinear (`LinearMipmapLinearFilter`)
- HDR Tone Mapping (`ACESFilmicToneMapping`)

### 🌱 Vegetação Billboard
- Cross-Planes com `alphaTest: 0.5` — recorte da silhueta sem blending lento
- `side: THREE.DoubleSide` — visível de qualquer ângulo
- Texturas PBR de `assets/ivy/`

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| [Three.js](https://threejs.org) | r128 | Motor de renderização 3D |
| [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) | r128 | Carregamento do labirinto `.glb` |
| HTML5 / CSS3 / JavaScript | — | UI, HUD, estilos |
| [Google Fonts](https://fonts.google.com) | — | Fredoka One + Nunito |

Sem frameworks, sem bundlers, sem dependências além do Three.js.


## Arquitetura

**Ordem de execução:**
1. `init()` → cria cena, câmara, renderer, chão, luzes, input, partículas, corpo, céu, labirinto
2. `animate()` → loop com `requestAnimationFrame`: movimento → câmara → vitória → corpo → lanterna → render
3. `updateAnimations()` → partículas + dia/noite + vegetação (em `extras.js`)
4. `SkyEnvironment.update()` → posição de Sol, Lua, estrelas, nuvens (em `sky.js`)

## Agradecimentos e Fontes

### Materiais e Ativos (Assets)
A qualidade visual e o realismo dos materiais baseiam-se em recursos de código aberto (Open Source), nomeadamente:
* **Polyhaven:** Todas as texturas de alta definição (PBR - Physically Based Rendering), incluindo mapas de cor, normais e rugosidade foram obtidos a partir da plataforma [Polyhaven](https://polyhaven.com/). Estes recursos foram fundamentais para a implementação do modelo de iluminação de Phong e Shading avançado.
* **Procedural Geometry: Low Poly Clouds | by Josh Marinacci | Medium:** O código das nuvens foi retirado do artigo da MEDIUM "Procedural Geometry: Low Poly Clouds" (https://medium.com/@joshmarinacci/procedural-geometry-low-poly-clouds-b86a0e66bcad).

### Apoio de Inteligência Artificial
No âmbito da concepção técnica e resolução de problemas de programação, foram utilizadas as seguintes ferramentas de IA generativa:
* **Google Gemini:** Utilizado como colaborador principal na estruturação do código Three.js, otimização da lógica do ciclo dia/noite e na integração técnica entre a modelação realizada no Blender e o pipeline de visualização 3D.
* **Claude (Anthropic):** Utilizado para o refinamento da lógica de detecção de colisões (Raycasting) e apoio na redação técnica e estruturação do relatório descritivo.

O uso destas ferramentas focou-se na aprendizagem e na superação de desafios técnicos específicos, garantindo que a implementação final reflete os conceitos teóricos lecionados na unidade curricular de Introdução à Computação Gráfica.
