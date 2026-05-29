// state.js
// Global game state — single mutable object shared across all ES modules.
// Import this in every file that needs shared state.

import * as THREE from 'three';

// ── Renderer & Core ──────────────────────────────────────────────────────────
export let scene    = null;
export let camera   = null;
export let renderer = null;
export let clock    = null;

// ── Game Flow ────────────────────────────────────────────────────────────────
export let paused      = false;
export let gameStarted = false;
export let gameWon     = false;

// ── Scene objects ────────────────────────────────────────────────────────────
export let mazeObjects  = [];
export let mazeMaterials = [];
export let exitPos      = null;  // initialised in initState()
export let vegetation   = [];
export let doors        = [];

// ── Player & Camera ──────────────────────────────────────────────────────────
export let playerBody  = null;
export let cameraMode  = 'FPS';
export const TPS_DISTANCE = 2.5;
export let playerPos   = null;  // initialised in initState()
export let KEY = { w: false, a: false, s: false, d: false, shift: false, space: false, control: false };
export let yaw    = 0;
export let pitch  = 0;
export let isLocked  = false;
export let flyMode   = false;
export let bobTimer  = 0;

// ── Torch & Lights ───────────────────────────────────────────────────────────
export let torch               = null;
export let torchOn             = false;
export let hasTorch            = false;
export let hasAcquiredTorch    = false;
export let torchTimeRemaining  = 0.0;
export let lastTime            = 0;
export let torchColor          = null;  // initialised in initState()
export let nightNotificationShown = false;
export let wallTorches = [];
export let lightPool   = [];
export let fpTorch     = null;

// ── Day/Night Cycle ──────────────────────────────────────────────────────────
export const DAY_CYCLE_DURATION = 360;
export const DAY_PHASE_NAMES = ['Amanhecer', 'Meio-Dia', 'Por-do-Sol', 'Noite'];
export let sunLight    = null;
export let ambientLight = null;
export let hemiLight   = null;
export let DAY_PHASES  = null;
export let currentPhase = '';
export let whisperBrightnessMult = 1.0;

// ── Collectibles & Story ─────────────────────────────────────────────────────
export let colecionaveis          = [];
export let aneisLuminosos         = [];
export let historiasColetadas     = [false, false, false];
export let idHistoriaAtivaAtualmente = null;

// ── Instructions scroll Whisp ────────────────────────────────────────────────
export let papiroMode            = 'collectible';
export let currentPapiroPage     = 0;
export let papiroWhisp           = null;
export let instructionsTriggered = false;
export let instancedColliders     = [];

// ── Firefly Particles ────────────────────────────────────────────────────────
export let whispers      = null;
export let whisperMeta   = [];
export let whisperPrevTime = 0;

// ── Setters (ES modules require explicit mutation helpers) ───────────────────
export const S = {
    setScene(v)          { scene = v; },
    setCamera(v)         { camera = v; },
    setRenderer(v)       { renderer = v; },
    setClock(v)          { clock = v; },
    setPaused(v)         { paused = v; },
    setGameStarted(v)    { gameStarted = v; },
    setGameWon(v)        { gameWon = v; },
    setExitPos(v)        { exitPos = v; },
    setPlayerPos(v)      { playerPos = v; },
    setPlayerBody(v)     { playerBody = v; },
    setCameraMode(v)     { cameraMode = v; },
    setYaw(v)            { yaw = v; },
    setPitch(v)          { pitch = v; },
    setIsLocked(v)       { isLocked = v; },
    setFlyMode(v)        { flyMode = v; },
    setBobTimer(v)       { bobTimer = v; },
    setTorch(v)          { torch = v; },
    setTorchOn(v)        { torchOn = v; },
    setHasTorch(v)       { hasTorch = v; },
    setHasAcquiredTorch(v){ hasAcquiredTorch = v; },
    setTorchTimeRemaining(v){ torchTimeRemaining = v; },
    setLastTime(v)       { lastTime = v; },
    setTorchColor(v)     { torchColor = v; },
    setNightNotificationShown(v){ nightNotificationShown = v; },
    setFpTorch(v)        { fpTorch = v; },
    setSunLight(v)       { sunLight = v; },
    setAmbientLight(v)   { ambientLight = v; },
    setHemiLight(v)      { hemiLight = v; },
    setDayPhases(v)      { DAY_PHASES = v; },
    setCurrentPhase(v)   { currentPhase = v; },
    setWhisperBrightnessMult(v){ whisperBrightnessMult = v; },
    setWhispers(v)       { whispers = v; },
    setWhisperPrevTime(v){ whisperPrevTime = v; },
    setLightPool(v)      { lightPool = v; },
    setIdHistoriaAtivaAtualmente(v){ idHistoriaAtivaAtualmente = v; },
    setPapiroMode(v)     { papiroMode = v; },
    setCurrentPapiroPage(v){ currentPapiroPage = v; },
    setPapiroWhisp(v)    { papiroWhisp = v; },
    setInstructionsTriggered(v){ instructionsTriggered = v; },
    setInstancedColliders(v){ instancedColliders = v; },

    // KEY mutations
    setKey(k, v)         { KEY[k] = v; },
};

// ── initState: called once at the start of init() ────────────────────────────
export function initState() {
    exitPos    = new THREE.Vector3(1.6, 0, -38.35);
    playerPos  = new THREE.Vector3();
    torchColor = new THREE.Color(0xffb52e);
}
