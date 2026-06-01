// config.js
// Central game configuration: tuning constants, story text, curiosity data, and instruction pages.

// ─── Player & World Tuning ───────────────────────────────────────────────────
export const CONFIG = {
    MODEL_PATH: 'labirintov5.glb',
    PLAYER_HEIGHT: 1.6,
    PLAYER_SPEED: 0.12,
    PLAYER_SPRINT: 0.22,
    COLLISION_MARGIN: 0.25,
    FOG_COLOR: 0xE0F7FA,
    EXIT_RADIUS: 1.5,

    // Proximity popup trigger/hide distances (objects.js)
    POPUP_DISTANCE: 3.0,
    POPUP_HIDE_DISTANCE: 4.5,

    // Firefly particle system (particles.js)
    WHISPER_COUNT: 200,
    WHISPER_SPREAD: 60,
};

// ─── Collectible Story Fragments ────────────────────────────────────────────
// Indexed 0=novelo, 1=espada, 2=estatua_girl
export const DADOS_HISTORIAS = [
    {
        titulo: "🧶 Fragmento III — O Fio da Razão",
        texto: "\"Chamaram-lhe 'o fio de Teseu', mas a lã azul foi fiada pelas minhas mãos. O labirinto não foi vencido por músculos, mas pela minha mente. Entreguei-lhe a salvação enrolada num novelo, e ele levou o crédito do meu intelecto. Aprende com o passado: a verdadeira chave nunca é a força bruta, mas o caminho que desenhas na escuridão.\"",
        emoji: "🧶"
    },
    {
        titulo: "🗡️ Fragmento I — A Lâmina da Traição",
        texto: "\"A espada que lhe dei cortou mais do que a carne de Asterion, o meu meio-irmão condenado a ser monstro pela ambição dos homens! Cortou também a minha ligação à minha pátria. Teseu ergueu esta arma triunfante, esquecendo que uma espada sem um caminho de regresso é apenas um túmulo. Ele matou a besta, mas eu salvei o homem.\"",
        emoji: "⚔️"
    },
    {
        titulo: "🏛️ Fragmento II — A Estátua Quebrada",
        texto: "\"A história esculpiu-me em mármore: a donzela ingénua chorando na ilha de Naxos, abandonada pelo 'herói' enquanto ele navegava para a glória. Das minhas lágrimas cresceu um jardim, regado pela minha mágoa! Das minhas memórias, fragmentos... \"",
        emoji: "🧍‍♀️"
    }
];

// ─── Non-collectible Curiosity Popup Content ─────────────────────────────────
// Keys match the popupKey passed to adicionarNaoColecionavel()
export const DADOS_POPUP = {
    minotauro: {
        titulo: '🐂 O Minotauro de Creta',
        icone: '🐂',
        texto: `O Minotauro — metade homem, metade touro — nasceu da união entre Pasífae, rainha de Creta, e um touro divino enviado por Posídon. O rei Minos, envergonhado, encomendou ao mestre artesão Dédalo a construção de um labirinto intrincado sob o Palácio de Cnossos para encarcerar a criatura. A cada nove anos, Atenas enviava sete jovens e sete donzelas como tributo, condenados a vaguear no labirinto até serem devorados. Foi Teseu, filho do rei ateniense Egeu, quem se voluntariou para pôr fim ao terror. Com a ajuda do fio de Ariadne, filha de Minos, Teseu matou o Minotauro e encontrou o caminho de volta para a luz.`
    },
    dolphin_sculpture: {
        titulo: '🐬 A Dança dos Golfinhos Minoicos',
        icone: '🐬',
        texto: `Os golfinhos eram um símbolo sagrado da civilização minoica, representando a ligação profunda deste povo com o Mar Mediterrâneo. O famoso fresco dos Golfinhos, descoberto no Palácio de Cnossos (~1600 a.C.), decorava o Megaron da Rainha e é uma das mais belas obras de arte do mundo egeu. Os minoicos eram navegadores e comerciantes habilidosos, estendendo as suas rotas até ao Egito, Síria e Grécia continental. Acredita-se que a civilização de Creta inspirou o mito de Atlântida descrito por Platão, após o seu colapso repentino por volta de 1450 a.C., possivelmente causado pela erupção do vulcão de Tera (Santorini).`
    },
    amfora: {
        titulo: '🏺 A Ânfora e o Comércio Minoico',
        icone: '🏺',
        texto: `As ânforas eram o principal recipiente de transporte do Mediterrâneo Antigo. Os minoicos usavam-nas para exportar azeite, vinho, mel e perfumes por toda a região egeia. O Palácio de Cnossos possuía vastos armazéns com centenas de pithoi (grandes jarros de cerâmica) para armazenar os excedentes agrícolas. A cerâmica minoica era famosa pela sua qualidade e padrões decorativos sofisticados — inspirados no mar, na natureza e em motivos geométricos. Estas trocas comerciais criaram uma rede cultural que influenciou profundamente a Grécia Clássica e, por consequência, toda a civilização ocidental.`
    },
    tocha: {
        titulo: '🔥 O Fogo dos Tributos',
        icone: '🔥',
        texto: `O Labirinto era um abismo de trevas quase absolutas. A cada nove anos, Atenas era forçada a enviar catorze jovens — sete rapazes e sete donzelas — como sacrifício a Minos. Eles eram empurrados para a escuridão, deambulando cegamente pelo terror até encontrarem o Minotauro. Estas tochas não foram deixadas por Dédalo; elas são o eco trágico daqueles que tentaram iluminar os seus últimos momentos, gravando a sua passagem na pedra fria antes de encontrarem a morte.`
    }
};

// ─── Instructions Papiro Pages ───────────────────────────────────────────────
// Shown when the player touches the initial whisp near the start position
export const INSTRUCTION_PAGES = [
    {
        titulo: "📖 O Mito de Creta (1/3)",
        texto: "O rei Minos aprisionou o seu mais vergonhoso segredo — o Minotauro, metade homem, metade touro — num labirinto insondável desenhado por Dédalo. Uma jaula de pedra fria, alimentada pela escuridão e pelo sacrifício de jovens atenienses."
    },
    {
        titulo: "⚔️ O Herói de Atenas (2/3)",
        texto: "A lenda sagrada celebra Teseu, o bravo herói. Conta a História que ele mergulhou sozinho no abismo, matou a besta com a sua lâmina e, guiado pela sua intuição e um simples fio de lã, encontrou o caminho de volta à luz. Um triunfo imortal da força e da coragem."
    },
    {
        titulo: "🌟 Os Ecos do Jardim (3/3)",
        texto: "Milénios depois, este labirinto transformou-se num jardim selado! Mas as paredes parecem sussurar que a lenda apagou alguém... Encontra os três fragmentos perdidos — o Novelo, a Espada e ??? — para abrires a porta para a tua liberdade!"
    }
];
