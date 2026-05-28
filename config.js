// config.js
// Game configuration settings and story descriptions

const DADOS_HISTORIAS = [
    {
        titulo: "📜 Fragmento I — O Fio de Ariadne",
        texto: "\"O novelo de lã azul não brilha por acaso. Segue o rastro da coragem. Onde o Minotauro range os dentes, a salvação vira as costas à criatura e aponta para o nascer do sol...\"",
        emoji: "🧶"
    },
    {
        titulo: "⚔️ Fragmento II — A Lâmina de Creta",
        texto: "\"O ferro cretense corta o mito. Quando a lâmina reflectir o crepúsculo, o caminho não está no sangue, mas sim no trilho onde a água flui contra a corrente...\"",
        emoji: "🗡️"
    },
    {
        titulo: "🏛️ Fragmento III — O Segredo de Dédalo",
        texto: "\"As paredes de Dédalo enganam os olhos, mas não o coração. Onde os Cornos Sagrados tocam o céu, o fio termina e a liberdade encontra-se nas sombras do Norte...\"",
        emoji: "🐂"
    }
];

const CONFIG = {
    MODEL_PATH: 'labirintov5.glb',
    PLAYER_HEIGHT: 1.6,
    PLAYER_SPEED: 0.12,
    PLAYER_SPRINT: 0.22,
    COLLISION_MARGIN: 0.25,
    FOG_COLOR: 0xE0F7FA,
    EXIT_RADIUS: 1.5
};
