const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelUpFlash = document.getElementById('level-up-flash');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameActive = false;
let score = 0;
let speed = 0.25;
let currentLevel = 1;
const levelThresholds = [100, 200, 350, 500, 650, 800, 1000];
let obstacles = [];
let roadSegments = [];
let lastTime = 0;
let spawnTimer = 0;

// Three.js Globals
let scene, camera, renderer;
let player, roadGroup;
let cityChunks = [];
let stars;
let explosions = [];
let shakeIntensity = 0;

function createExplosion(pos) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push(pos.x, pos.y, pos.z);
        // Explosion expanding out
        velocities.push(
            (Math.random() - 0.5) * 1.5, // X
            (Math.random() - 0.5) * 1.5 + 0.5, // Y (Upward bias)
            (Math.random() - 0.5) * 1.5  // Z
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.5,
        transparent: true,
        opacity: 1
    });

    const explosion = new THREE.Points(geometry, material);
    explosion.userData = { velocities: velocities };
    scene.add(explosion);
    explosions.push(explosion);
}

// Constants
const LANE_WIDTH = 3;
const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
let currentLane = 1;

function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 20, 150);

    // Camera (Dynamic FOV for Speed Feel)
    // On mobile (portrait), we need a wider FOV to see more and feel faster
    const isMobile = window.innerWidth < window.innerHeight;
    const fov = isMobile ? 80 : 60;

    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);

    if (isMobile) {
        camera.position.set(0, 4, 12); // Slightly lower and further back on mobile
    } else {
        camera.position.set(0, 5, 10);
    }

    camera.lookAt(0, 0, -10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Neon Lights
    const neonLight = new THREE.PointLight(0x00f3ff, 1, 50);
    neonLight.position.set(0, 5, -5);
    scene.add(neonLight);

    createPlayer();

    // Road Loop
    roadGroup = new THREE.Group();
    scene.add(roadGroup);
    for (let i = 0; i < 25; i++) {
        createRoadSegment(-i * 10);
    }

    // City Background (2 Segments for looping)
    // Segment Length = 500. 
    // Segment 1 at 0, Segment 2 at -500.
    const chunk1 = createCitySegment();
    chunk1.position.z = 0;
    scene.add(chunk1);
    cityChunks.push(chunk1);

    const chunk2 = createCitySegment();
    chunk2.position.z = -500;
    scene.add(chunk2);
    cityChunks.push(chunk2);

    // Environment (Skybox & Textures)
    createEnvironment();

    // Rain Effect
    createRain();

    window.addEventListener('resize', onWindowResize, false);
}

function createEnvironment() {
    const loader = new THREE.TextureLoader();

    // 1. SkyDome (Rainy Panorama)
    loader.load('assets/rain_skyline.png', function (texture) {
        const skyGeo = new THREE.SphereGeometry(600, 32, 32); // Larger Skybox
        skyGeo.scale(-1, 1, 1);
        const skyMat = new THREE.MeshBasicMaterial({
            map: texture,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.rotation.y = Math.PI / 2;
        scene.add(sky);
    });

    // Darker, denser fog for rainy mood (blends buildings into sky)
    scene.fog = new THREE.FogExp2(0x020205, 0.015);
}

let rainGeo, rainSystem;
function createRain() {
    const rainCount = 15000;
    rainGeo = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = Math.random() * 200;
        const z = (Math.random() - 0.5) * 400;
        positions.push(x, y, z);
    }

    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.2,
        transparent: true,
        opacity: 0.6
    });

    rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);
}

function createCitySegment() {
    const chunk = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Load Texture (Cached if reused properly, but here handled by browser cache usually)
    const loader = new THREE.TextureLoader();
    const windowTex = loader.load('assets/windows.png');
    windowTex.wrapS = THREE.RepeatWrapping;
    windowTex.wrapT = THREE.RepeatWrapping;
    windowTex.repeat.set(1, 3);

    // Base Materials
    const materialBase = new THREE.MeshPhongMaterial({ color: 0x050505 });
    const materialWindows = new THREE.MeshPhongMaterial({
        map: windowTex,
        emissive: 0x001133,
        emissiveMap: windowTex,
        emissiveIntensity: 1.5
    });

    // Massive 3D Architecture Generation
    for (let i = 0; i < 150; i++) { // 150 buildings per chunk
        // Skyscraper Logic
        const height = Math.random() * 150 + 50;
        const width = Math.random() * 20 + 8;
        const depth = width;

        // Create Mesh
        const building = new THREE.Mesh(geometry, [
            materialWindows, materialWindows, materialBase, materialBase, materialWindows, materialWindows
        ]);

        building.scale.set(width, height, depth);

        const layer = Math.random() > 0.7 ? 2 : 1;
        const side = Math.random() > 0.5 ? 1 : -1;

        let xPos, zPos;

        // Z Position: Distribute along the 500 unit length of this segment
        // Local Z: 0 to -500
        zPos = -Math.random() * 500;

        if (layer === 1) {
            xPos = side * (Math.random() * 50 + 30);
        } else {
            xPos = side * (Math.random() * 200 + 100);
            building.scale.y *= 1.5;
        }

        // Ground level logic
        const yPos = -building.scale.y / 2 - 5;

        building.position.set(xPos, yPos, zPos);
        chunk.add(building);
    }
    return chunk;
}

function createPlayer() {
    player = new THREE.Group();

    // Car Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 2.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x500000 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    player.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(0.8, 0.4, 1.2);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.9, -0.2);
    player.add(cabin);

    // Wheels setup...
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const w1 = new THREE.Mesh(wheelGeo, wheelMat);
    w1.rotation.z = Math.PI / 2; w1.position.set(0.7, 0.3, 0.8); player.add(w1);
    const w2 = w1.clone(); w2.position.set(-0.7, 0.3, 0.8); player.add(w2);
    const w3 = w1.clone(); w3.position.set(0.7, 0.3, -0.8); player.add(w3);
    const w4 = w1.clone(); w4.position.set(-0.7, 0.3, -0.8); player.add(w4);

    player.position.set(0, 0, 5);
    scene.add(player);
}

function createRoadSegment(zPos) {
    const roadLength = 10;
    const roadWidth = 12;
    const thickness = 2; // Road thickness

    // Main Road (Thick)
    const geometry = new THREE.BoxGeometry(roadWidth, thickness, roadLength);
    const material = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const road = new THREE.Mesh(geometry, material);
    road.position.set(0, -thickness / 2, zPos - roadLength / 2);
    road.receiveShadow = true;

    // Support Pillar (Underneath)
    const pillarGeo = new THREE.BoxGeometry(2, 20, 2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(0, -10 - thickness / 2, 0);
    road.add(pillar);

    // Visible Street Poles (Rising up)
    const poleHeight = 8;
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, poleHeight, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });

    // Left Pole
    const leftPole = new THREE.Mesh(poleGeo, poleMat);
    leftPole.position.set(-roadWidth / 2 - 0.5, poleHeight / 2 - thickness / 2, 0);
    road.add(leftPole);

    // Left Light (Neon Bulb)
    const lightGeo = new THREE.BoxGeometry(1, 0.2, 0.2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(0.5, poleHeight / 2, 0);
    leftPole.add(leftLight);

    // Right Pole
    const rightPole = new THREE.Mesh(poleGeo, poleMat);
    rightPole.position.set(roadWidth / 2 + 0.5, poleHeight / 2 - thickness / 2, 0);
    road.add(rightPole);

    // Right Light (Neon Bulb)
    const rightLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x00f3ff })); // Cyan
    rightLight.position.set(-0.5, poleHeight / 2, 0);
    rightPole.add(rightLight);

    // Lane Lines
    const lineGeo = new THREE.PlaneGeometry(0.2, roadLength);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const line1 = new THREE.Mesh(lineGeo, lineMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(-1.5, thickness / 2 + 0.02, 0);
    road.add(line1);

    const line2 = line1.clone();
    line2.position.set(1.5, thickness / 2 + 0.02, 0);
    road.add(line2);

    // Neon Edges
    const edgeGeo = new THREE.PlaneGeometry(0.5, roadLength);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide });

    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    leftEdge.rotation.x = -Math.PI / 2;
    leftEdge.position.set(-roadWidth / 2 + 0.25, thickness / 2 + 0.02, 0);
    road.add(leftEdge);

    const rightEdge = leftEdge.clone();
    rightEdge.position.set(roadWidth / 2 - 0.25, thickness / 2 + 0.02, 0);
    road.add(rightEdge);

    roadGroup.add(road);
    roadSegments.push(road);
}

function createEnemyCar() {
    const carGroup = new THREE.Group();
    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 2.5);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0055ff, emissive: 0x001144 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);
    // Cabin
    const cabinGeo = new THREE.BoxGeometry(0.8, 0.4, 1.2);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.9, 0);
    carGroup.add(cabin);
    // Wheels...
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const w1 = new THREE.Mesh(wheelGeo, wheelMat);
    w1.rotation.z = Math.PI / 2; w1.position.set(0.7, 0.3, 0.8); carGroup.add(w1);
    const w2 = w1.clone(); w2.position.set(-0.7, 0.3, 0.8); carGroup.add(w2);
    const w3 = w1.clone(); w3.position.set(0.7, 0.3, -0.8); carGroup.add(w3);
    const w4 = w1.clone(); w4.position.set(-0.7, 0.3, -0.8); carGroup.add(w4);

    return carGroup;
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const xPos = LANE_POSITIONS[lane];
    const obsGroup = createEnemyCar();
    obsGroup.position.set(xPos, 0, -80);
    scene.add(obsGroup);
    obstacles.push({ mesh: obsGroup });
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    score = 0;
    speed = 0.25; // 50 km/h
    currentLevel = 1;
    // levelThresholds.unshift(100); // REMOVED: This was causing the bug by adding duplicate thresholds
    // Actually currentLevel starts at 1. Next threshold is at index 0 (100).

    levelElement.innerText = currentLevel;
    scoreElement.innerText = score;
    speedElement.innerText = Math.floor(speed * 200);

    currentLane = 1;
    player.position.set(LANE_POSITIONS[currentLane], 0, 5);
    player.rotation.set(0, 0, 0);
    player.visible = true;

    obstacles.forEach(o => scene.remove(o.mesh));
    obstacles = [];

    AudioManager.startMusic();
    lastTime = performance.now();
    animate();
}

function gameOver() {
    gameActive = false;
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
    AudioManager.stopMusic();
    AudioManager.playCrashSound();

    // Crash Effects
    createExplosion(player.position);
    shakeIntensity = 2.0;

    // Save Score (Firebase)
    if (typeof saveHighScore === 'function') {
        saveHighScore(score);
    }
}

function checkLevelUp() {
    // Thresholds: 100, 200, 350, 500, 650, 800, 1000
    // Then +200 for each subsequent level? "and so on"
    let nextThreshold;
    if (currentLevel <= 7) {
        nextThreshold = levelThresholds[currentLevel - 1];
    } else {
        // After level 7 (1000), add 200 per level
        nextThreshold = 1000 + (currentLevel - 7) * 200;
    }

    if (score >= nextThreshold) {
        currentLevel++;
        levelElement.innerText = currentLevel;

        // Standard Difficulty Increase
        speed += 0.05;

        // "Increase difficulties when we level of 3 times"
        // Interpreted as: Every 3rd level (3, 6, 9...), major difficulty spike
        if (currentLevel % 3 === 0) {
            speed += 0.1; // Extra speed boost
            // Flash color change or visual indication could be added here
        }

        // Flash UI
        levelUpFlash.classList.remove('hidden');
        levelUpFlash.innerText = `LEVEL ${currentLevel}`;
        levelUpFlash.style.animation = 'none';
        levelUpFlash.offsetHeight; /* trigger reflow */
        levelUpFlash.style.animation = null;

        setTimeout(() => {
            levelUpFlash.classList.add('hidden');
        }, 1000);

        AudioManager.playLevelUpSound();
    }
}

function animate(time) {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // Move Player Smoothly
    player.position.x += (LANE_POSITIONS[currentLane] - player.position.x) * 0.1;
    player.rotation.z = (player.position.x - LANE_POSITIONS[currentLane]) * 0.1;

    // Move Road
    roadSegments.forEach(s => s.position.z += speed);

    if (roadSegments[0].position.z > 15) {
        const first = roadSegments.shift();
        const lastZ = roadSegments[roadSegments.length - 1].position.z;
        first.position.z = lastZ - 10;
        roadSegments.push(first);
    }

    // Move City (Infinite Scroll)
    cityChunks.forEach(chunk => {
        chunk.position.z += speed * 0.5; // Parallax speed
        if (chunk.position.z > 200) { // If processed through camera
            chunk.position.z -= 1000; // Move back: 2 segments * 500 length
        }
    });

    // Animate Rain
    if (rainSystem) {
        const positions = rainSystem.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 2; // Fall down
            if (positions[i] < -10) positions[i] = 200; // Reset height
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Obstacles Spawn Logic
    // Base chance 0.02. Increase by level.
    // Every 3 levels (difficulty spike), this gets a boost implicitly by speed, 
    // but let's make density higher too.
    let spawnChance = 0.02 + (currentLevel * 0.002);
    if (currentLevel >= 3) spawnChance += 0.01;
    if (currentLevel >= 6) spawnChance += 0.01;

    if (Math.random() < spawnChance) {
        if (obstacles.length === 0 || obstacles[obstacles.length - 1].mesh.position.z > -60) {
            spawnObstacle();
        }
    }

    obstacles.forEach((obs, index) => {
        obs.mesh.position.z += speed;
        // Collision
        const dx = Math.abs(player.position.x - obs.mesh.position.x);
        const dz = Math.abs(player.position.z - obs.mesh.position.z);
        if (dx < 1.0 && dz < 2.0) gameOver();

        if (obs.mesh.position.z > 10) {
            scene.remove(obs.mesh);
            obstacles.splice(index, 1);
            score += 10;
            scoreElement.innerText = score;
            checkLevelUp();
        }
    });

    // Continuous subtle speed increase
    speed += 0.0001;
    speedElement.innerText = Math.floor(speed * 200);

    renderer.render(scene, camera);
}

function onWindowResize() {
    const isMobile = window.innerWidth < window.innerHeight;
    camera.fov = isMobile ? 80 : 60;
    if (isMobile) {
        camera.position.set(0, 4, 12);
    } else {
        camera.position.set(0, 5, 10);
    }

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
// Keyboard Controls
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        moveLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
        moveRight();
    }
});

// Touch Controls
// Touch Controls (Swipe + Tap)
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!gameActive) return;
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // Swipe Threshold (30px)
    if (Math.abs(dx) > 30) {
        // Horizontal Swipe
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) moveRight();
            else moveLeft();
        }
    } else {
        // Tap (Fallback to Zone)
        const halfWidth = window.innerWidth / 2;
        if (touchEndX < halfWidth) moveLeft();
        else moveRight();
    }
}, { passive: false });

function moveLeft() {
    if (currentLane > 0) { currentLane--; AudioManager.playMoveSound(); }
}

function moveRight() {
    if (currentLane < 2) { currentLane++; AudioManager.playMoveSound(); }
}

// --- Audio Manager ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const AudioManager = {
    oscillator: null,
    bassOsc: null,
    gainNode: null,
    musicInterval: null,
    musicPlaying: false,

    init: function () { if (audioCtx.state === 'suspended') audioCtx.resume(); },

    playMoveSound: function () {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    },

    playCrashSound: function () {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const gain = audioCtx.createGain();
        noise.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        noise.start();
    },

    playLevelUpSound: function () {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1); // C#
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2); // E
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); // A
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
        osc.start(); osc.stop(audioCtx.currentTime + 0.6);
    },

    startMusic: function () {
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Synthwave Bass Loop
        // 16th notes bassline
        const tempo = 120;
        const noteDuration = 60 / tempo / 4;
        let noteIndex = 0;
        const bassNotes = [36, 36, 48, 36, 39, 39, 51, 39, 34, 34, 46, 34, 41, 41, 53, 41]; // MIDI Note numbers (C2, D#2, A#1, F2)

        this.musicInterval = setInterval(() => {
            if (!this.musicPlaying) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            const freq = 440 * Math.pow(2, (bassNotes[noteIndex % 16] - 69) / 12);
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, audioCtx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + noteDuration);

            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + noteDuration);

            osc.start();
            osc.stop(audioCtx.currentTime + noteDuration);

            noteIndex++;
        }, noteDuration * 1000); // ms
    },

    stopMusic: function () {
        this.musicPlaying = false;
        if (this.musicInterval) clearInterval(this.musicInterval);
    }
};

init();
startBtn.addEventListener('click', () => { AudioManager.init(); startGame(); });
restartBtn.addEventListener('click', startGame);
