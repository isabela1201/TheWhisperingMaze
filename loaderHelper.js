// loaderHelper.js
// Utility to share a single pre-configured GLTFLoader/DRACOLoader setup

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let dracoLoader = null;

export function getGLTFLoader() {
    const loader = new GLTFLoader();
    if (!dracoLoader) {
        dracoLoader = new DRACOLoader();
        // Set the path to the folder containing the Draco decoder JS and WASM files on jsDelivr CDN
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/draco/');
        // Enable Web Workers to run Draco decoding in parallel threads, preventing UI freeze
        dracoLoader.setWorkerLimit(2);
        dracoLoader.preload();
    }
    loader.setDRACOLoader(dracoLoader);
    return loader;
}
