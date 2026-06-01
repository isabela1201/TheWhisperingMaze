# 🌿 The Whispering Maze

Projeto para a cadeira de **Introdução à Computação Gráfica (ICG)**.  
Um jogo 3D de exploração na primeira pessoa situado no Labirinto de Creta — inspirado na **Lenda do Minotauro** e na **Lenda de Dédalo**.

---

## 🏛️ Conceito e História

A lenda é conhecida: Teseu matou o Minotauro e escapou do labirinto graças ao seu talento e coragem.

Mas será essa versão da história *imparcial*? **Estamo-nos a esquecer de alguém?**

> *Sim — Ariadne.*

O labirinto passou milénios em silêncio. O sangue do Minotauro fertilizou as pedras, e um jardim nasceu entre as muralhas. Agora, fragmentos de uma narrativa esquecida sussurram entre as plantas — a perspectiva da princesa minoica que foi apagada da glória do "herói".

Explora o labirinto, recolhe os **três fragmentos perdidos** de Ariadne e desvendas os segredos que a História oficial preferiu ignorar. Só então a porta se abrirá.

---

## 🎮 Como Jogar

| Tecla | Ação |
|---|---|
| `W A S D` | Mover |
| `Rato` | Olhar em volta |
| `Shift` | Correr |
| `F` | Equipar / guardar tocha |
| `C` | Alternar câmara FPS / TPS |
| `Click` (numa tocha da parede) | Roubar / reacender tocha |
| `Esc` | Pausar / retomar |

**Objetivo:** Explora o labirinto, recolhe os **3 fragmentos de Ariadne** e abre a porta da saída.

---

## 🗺️ Fluxo do Jogo

```
┌─────────────────────────────────────────────────────────────────┐
│  ECRÃ INICIAL                                                   │
│  → Clica "Começar" para iniciar e bloquear o rato              │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  LOADING                                                        │
│  → Carrega texturas do chão (Polyhaven), labirinto GLB,        │
│    vegetação (erva, árvores, cogumelos)                        │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  JOGO — EXPLORAÇÃO DO LABIRINTO                                 │
│                                                                 │
│  1. O jogador aparece perto da entrada                          │
│  2. Um "whisp" dourado flutuante apresenta o contexto          │
│     narrativo em 3 páginas (O Mito → O Herói → Os Ecos)       │
│                                                                 │
│  3. Ao explorar, o jogador encontra:                            │
│     • 🐂 Minotauro    → popup com curiosidade histórica        │
│     • 🐬 Golfinho     → popup com curiosidade minoica          │
│     • 🏺 Ânfora       → popup com contexto comercial           │
│     • 🔥 Tochas na parede → clica para roubar/reacender luz    │
│                                                                 │
│  4. Coleta os 3 fragmentos de Ariadne (com anel luminoso):     │
│     🧶 Novelo (id=0)  → Fragmento II — O Fio da Razão         │
│     ⚔️  Espada (id=1)  → Fragmento I  — A Lâmina da Traição   │
│     🏛️ Estátua (id=2) → Fragmento III — A Estátua Quebrada   │
│                                                                 │
│  5. A cor da tocha muda com cada fragmento coletado:           │
│     🔵 Azul (novelo) → 🟢 Verde (espada) → 🟣 Roxo (estátua) │
│                                                                 │
│  6. Após os 3 fragmentos → PORTA DESBLOQUEADA 🚪              │
│     (animação de abertura + notificação)                        │
│                                                                 │
│  7. Jogador chega à saída → ECRÃ DE VITÓRIA                    │
│     (exibe o tempo total de exploração)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Sistema de Tocha 🔥
O labirinto tem um ciclo dia/noite. Quando a noite cai, surge uma notificação a avisar que está escuro. O jogador pode **clicar** numa tocha da parede (a menos de 3.5 unidades) para a roubar/reacender. Cada tocha dura **60 segundos**. Se se apagar, tem de ser reacendida noutra tocha da parede.

---

## ✨ Funcionalidades Implementadas

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
- **Nuvens**: geometria procedural — 3 esferas fundidas com *jitter* de vértices e base achatada (`chopBottom`)

### 🔦 Tocha (`SpotLight`)
- Cone de luz direcional com atenuação quadrática `decay: 2` (1/d²)
- Piscar com ruído de frequência dupla: `sin(t×6.3) + sin(t×17.7)` — simula chama instável
- Toggle com tecla `F`; sistema de temporizador de 60 segundos
- Cor dinâmica que evolui com a narrativa (laranja → azul → verde → roxo)

### 🌿 Pirilampos / Whispers (`particles.js`)
- Sistema de 200 partículas com `BufferGeometry` e `Float32Array`
- Cada partícula tem metadados individuais: posição base, fase, velocidade, tempo de vida, fade-in/out
- Flutuação orgânica com sin/cos de fase independente por eixo
- Ficam mais brilhantes à noite, sincronizados com o ciclo dia/noite

### 📷 Câmaras FPS / TPS (`player.js`)
- **FPS**: câmara posicionada nos "olhos" do jogador com controlo direto
- **TPS**: câmara orbita atrás/acima com colisão própria (Raycaster aplicado ao frustum)
- Mudança de FOV ao alternar (75° FPS → 65° TPS) com `updateProjectionMatrix()`
- Toggle com tecla `C`

### 🧱 Colisão via Raycaster
Dois raios independentes por eixo (X e Z) a partir da posição do jogador. Separar os eixos permite deslizar ao longo das paredes em vez de parar completamente.

### 🎨 Materiais PBR
- `MeshStandardMaterial` com `roughness`, `metalness`, `normalMap`, `emissive`
- Anisotropia limitada a 4x nas texturas (`getMaxAnisotropy()`)
- Mipmapping trilinear (`LinearMipmapLinearFilter`)
- HDR Tone Mapping (`ACESFilmicToneMapping`)

### 🌱 Vegetação
- **Relva e árvores**: cross-planes com `alphaTest: 0.5` — recorte da silhueta sem blending lento
- **Cogumelos**: geração procedural otimizada com ~400 instâncias espalhadas pelo labirinto
- `side: THREE.DoubleSide` — visível de qualquer ângulo

### 🔊 Áudio Espacial (`THREE.Audio`)
- Som ambiente em loop (`THREE.Audio`)
- Som de coleta ao apanhar um fragmento

### 🔥 HUD — Barra de Tocha (canto superior esquerdo)
- Barra que diminui em tempo real à medida que o tempo de tocha vai acabando (60 segundos)
- Quando a tocha **não está equipada**: barra acinzentada e quase transparente
- Quando a tocha está ativa: barra âmbar com glow laranja
- Quando restam **≤20%** do tempo: barra vermelha com animação de pulso pulsante

### 🧱 Colisores nos Assets 3D (`objects.js`)
- Cada modelo GLB carregado (colecionável ou decorativo) recebe automaticamente um colisor esférico
- O raio é calculado a partir da diagonal XZ do bounding box do modelo
- Os colisores são adicionados ao array `instancedColliders`, partilhado com o sistema de colisão do jogador em `player.js`

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| [Three.js](https://threejs.org) | r184 | Motor de renderização 3D |
| [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) | r184 | Carregamento do labirinto e objetos `.glb` |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | — | BVH para raycasting ultra-rápido |
| HTML5 / CSS3 / JavaScript | — | UI, HUD, estilos |
| [Google Fonts](https://fonts.google.com) | — | Fredoka One + Nunito |

Sem frameworks, sem bundlers, sem dependências além do Three.js e three-mesh-bvh.

---

## 🗂️ Arquitetura

**Estrutura modular do projeto:**

| Ficheiro | Responsabilidade |
|---|---|
| `config.js` | Constantes de jogo, textos das histórias e dados dos popups |
| `state.js` | Variáveis globais partilhadas entre módulos |
| `ui.js` | Overlays (papiros de Ariadne), notificações e HUD |
| `sky.js` | Domínio celeste procedural (sol, lua, nuvens, estrelas) |
| `particles.js` | Sistema de pirilampos/whispers otimizado |
| `player.js` | Jogador (FPS/TPS), corpo, tocha na mão e colisões |
| `environment.js` | Iluminação, ciclo dia/noite e geração de vegetação/cogumelos |
| `objects.js` | Objetos interativos, colecionáveis, popups e lógica de desbloqueio da porta |
| `door.js` | Criação e animação da porta de saída |
| `main.js` | Ponto de entrada — inicializa a cena e gere o loop principal |

**Ordem de execução:**

1. `init()` → cria cena, câmara, renderer, chão, iluminação, partículas, jogador, céu, labirinto e objetos interativos.
2. `loadMazeModel()` → carrega o `.glb` do labirinto; após carregamento, gera tochas, erva, floresta e cogumelos sequencialmente (async).
3. `animate()` → loop com `requestAnimationFrame`:
   - Anima os anéis e o whisp de instruções
   - Verifica proximidade de colecionáveis e popups
   - `updateMovement()` → colisão + velocidade
   - `updateAnimations()` → pirilampos, ciclo dia/noite, corpo do jogador
   - `SkyEnvironment.update()` → Sol, Lua, estrelas, nuvens
   - Câmara (FPS ou TPS com raycasting anti-clip)
   - Verifica condição de vitória (distância à saída)
   - Gere tocha do jogador (timer, cor, flickering) e tochas da parede (culling por distância, só 4 activas, sombra apenas na mais próxima)
   - Atualiza a barra HUD da tocha (largura + classes CSS `active`/`low`) a cada frame

---

## 🙏 Agradecimentos e Créditos

Dedico este projeto à minha irmã, Matilde, pela ajuda nas decisões

### 🏺 Modelos 3D (Sketchfab)

> **Nota de posicionamento:** todos os modelos 3D foram posicionados **à mão** no espaço do labirinto, com coordenadas (X, Y, Z) e rotações definidas manualmente em `objects.js` após iterações de teste para garantir o alinhamento correto com o chão, paredes e narrativa.


| Modelo | Autor | Licença |
|---|---|---|
| [Theseus Minotaur](https://skfb.ly/6nFKn) | remina | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Minoan Inspired Ancient Amphora](https://skfb.ly/6ZpGQ) | vasileia_petraki | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Minoan Bull Statuette](https://skfb.ly/pHCGu) | HN-Group | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Dolphin Sculpture](https://skfb.ly/opTxI) | Pabluuu | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |

### 🖼️ Texturas e Materiais

- **[Polyhaven](https://polyhaven.com/)** — Todas as texturas PBR de alta definição (relva do chão e paredes do labirinto): mapas de cor, normais e rugosidade.

### 💻 Código e Referências

- **[Procedural Geometry: Low Poly Clouds](https://medium.com/@joshmarinacci/procedural-geometry-low-poly-clouds-b86a0e66bcad)** — Josh Marinacci / Medium: base do código das nuvens procedurais.
- **[How to Draw Generative NFT Mushrooms with Three.js](https://hackernoon.com/how-to-draw-generative-nft-mushrooms-with-threejs)** — HackerNoon: referência para a geração procedural dos cogumelos.

### 🤖 Apoio de Inteligência Artificial

- **Google Gemini** — Colaborador principal na estruturação do código Three.js, otimização do ciclo dia/noite e integração do pipeline Blender → Three.js.
- **Claude (Anthropic)** — Refinamento da lógica de deteção de colisões (Raycasting) e apoio na redação técnica.

O uso destas ferramentas focou-se na aprendizagem e na superação de desafios técnicos específicos, garantindo que a implementação reflete os conceitos teóricos da unidade curricular de Introdução à Computação Gráfica.
