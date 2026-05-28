// state.js
// Global game state variables shared across modules
// NOTE: All THREE.* object instantiations are deferred to initState(),
//       called at the start of init(), after Three.js is loaded.

let paused = false;
let scene = null;
let camera = null;
let renderer = null;
let clock = null;

let gameStarted = false;
let gameWon = false;
let mazeObjects = [];
let exitPos = null;      // initialised in initState()

// Nature & Vegetation
let vegetation = [];
let doors = [];
let bobTimer = 0;

// Player & Camera
let playerBody = null;
let cameraMode = 'FPS';
const TPS_DISTANCE = 2.5;  // Third-person camera arm length
let playerPos = null;    // initialised in initState()
let KEY = { w: false, a: false, s: false, d: false, shift: false, space: false, control: false };
let yaw = 0;
let pitch = 0;
let isLocked = false;
let flyMode = false;

// Torch & Lights
let torch = null;
let torchOn = false;
let hasTorch = false;
let hasAcquiredTorch = false; // Track if the player has ever picked up a torch
let torchTimeRemaining = 0.0;
let lastTime = 0;
let torchColor = null;   // initialised in initState()
let nightNotificationShown = false;
let wallTorches = [];
let lightPool = [];
let fpTorch = null;

// Day & Night Cycle
const DAY_CYCLE_DURATION = 360;
const DAY_PHASE_NAMES = ['Amanhecer', 'Meio-Dia', 'Por-do-Sol', 'Noite'];
let sunLight = null;
let ambientLight = null;
let hemiLight = null;
let mazeMaterials = [];
let DAY_PHASES = null;
let currentPhase = '';
let whisperBrightnessMult = 1.0;

// Collectibles & Story progress
let colecionaveis = [];
let aneisLuminosos = [];
let historiasColetadas = [false, false, false];
let idHistoriaAtivaAtualmente = null;

// Fireflies (Whispers) Particles
let whispers = null;
let whisperMeta = [];
let whisperPrevTime = 0;

// Called at the very start of init(), after Three.js is confirmed loaded
function initState() {
    exitPos    = new THREE.Vector3(1.6, 0, -38.35);
    playerPos  = new THREE.Vector3();
    torchColor = new THREE.Color(0xffb52e);
}
