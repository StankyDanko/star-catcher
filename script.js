// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBXaY6hn6NDJI6WEy1mvtGRXl6V5_W7HJs",
    authDomain: "sd-opinion-statements.firebaseapp.com",
    projectId: "sd-opinion-statements",
    storageBucket: "sd-opinion-statements.firebasestorage.app",
    messagingSenderId: "702007524321",
    appId: "1:702007524321:web:9b25faa3203a3b621af0a0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
const loginButton = document.getElementById('login-button');
const loginContainer = document.getElementById('login-container');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
const levelText = document.getElementById('level-text');
const progressFill = document.getElementById('progress-fill');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const dialogue = document.getElementById('dialogue');
const statement = document.getElementById('statement');
const agreeBtn = document.getElementById('agree');
const disagreeBtn = document.getElementById('disagree');

// User State
let currentUser = null;
let userExp = 0;

// Firebase UI Config
const uiConfig = {
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: { signInSuccessWithAuthResult: () => false }
};

let retryCount = 0;
const MAX_RETRIES = 5;

function initFirebaseUI() {
    if (typeof firebaseui === 'undefined') {
        if (retryCount < MAX_RETRIES) {
            console.error('Firebase UI not loaded yet. Retrying...');
            retryCount++;
            setTimeout(initFirebaseUI, 1000);
        }
        return;
    }
    const ui = new firebaseui.auth.AuthUI(auth);
    ui.start('#firebaseui-auth-container', uiConfig);
}

loginButton.addEventListener('click', () => {
    firebaseuiContainer.style.display = 'block';
    initFirebaseUI();
});

logoutButton.addEventListener('click', () => auth.signOut().catch(error => console.error('Logout failed:', error)));

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userName.textContent = user.displayName || user.email;
        userInfo.style.display = 'block';
        loginContainer.style.display = 'none';
        loadUserData(user.uid);
    } else {
        currentUser = null;
        userInfo.style.display = 'none';
        loginContainer.style.display = 'block';
        firebaseuiContainer.style.display = 'none';
        userExp = 0;
    }
});

async function loadUserData(uid) {
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        userExp = userDoc.exists ? (userDoc.data().exp || 0) : 0;
        if (!userDoc.exists) await userDocRef.set({ exp: 0 });
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Op-Stat Management
const directionPrefixes = [
    "mbti_e", "mbti_i", "mbti_s", "mbti_n", "mbti_t", "mbti_f", "mbti_j", "mbti_p",
    "pol_left", "pol_right", "pol_auth", "pol_lib", "media_char", "media_plot",
    "media_depth", "media_light", "media_real", "media_fantasy", "media_complex", "media_simple"
];

let opStatQueue = [];
let isLoadingOpStats = false;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function loadOpStats() {
    if (isLoadingOpStats) return;
    isLoadingOpStats = true;
    try {
        const opStatIds = directionPrefixes.map(prefix => `${prefix}_${Math.floor(Math.random() * 50) + 1}`);
        const opStatDocs = await Promise.all(opStatIds.map(id => db.collection("op-stats").doc(id).get()));
        const fetchedOpStats = opStatDocs.filter(doc => doc.exists).map(doc => ({ id: doc.id, ...doc.data() }));
        opStatQueue = opStatQueue.concat(shuffleArray(fetchedOpStats));
    } catch (error) {
        console.error("Error loading op-stats:", error);
    } finally {
        isLoadingOpStats = false;
    }
}

loadOpStats();

// Canvas Setup
let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Matrix Functions
function multiplyMatrices(m1, m2) {
    let result = [[0,0,0], [0,0,0], [0,0,0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) result[i][j] += m1[i][k] * m2[k][j];
    return result;
}

function multiplyMatrixVector(matrix, vector) {
    return [
        matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
        matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
        matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
    ];
}

function transpose(m) {
    return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
}

// Audio
const agreeSound = new Audio('agree.webm');
const disagreeSound = new Audio('disagree.webm');
const levelUpSound = new Audio('lvl-up.webm');
const catchSound = new Audio('catch.webm');

// Set volume to 50%
agreeSound.volume = 0.05;
disagreeSound.volume = 0.05;
levelUpSound.volume = 0.05;
catchSound.volume = 0.05;

// Device Detection and Precision
const isTouchDevice = 'ontouchstart' in window;
const desktopPrecision = 1.2; // 20% larger hit area
const mobilePrecision = 2.0; // 100% larger hit area
const mobileNearMissChance = 0.8; // 80% chance for near misses
const maxDistance = 100; // Max distance for near-miss consideration

// Star Class
class Star {
    constructor() {
        this.x = Math.random() * 1000 - 500;
        this.y = Math.random() * 1000 - 500;
        this.z = Math.random() * 1000;
        this.baseSize = Math.random() * 6 + 3;
        this.resetColor();
        this.opStat = null;
        this.lastX = undefined;
        this.lastY = undefined;
        this.lastSize = 0;
    }

    resetColor() {
        const r = Math.random();
        this.color = r < 1 / 10800 ? '#FFD700' : r < 0.7 ? 'white' :
            (Math.random() < 0.6667 ? '#99FF66' : Math.random() < 0.9 ? '#66FFFF' : '#9966FF');
    }

    assignOpStat() {
        this.opStat = opStatQueue.length > 0 ? opStatQueue.shift() : { text: "Loading...", id: "placeholder" };
        if (opStatQueue.length === 0 && !isLoadingOpStats) loadOpStats();
    }

    update(speed) {
        this.z -= speed;
        if (this.z < 1) {
            this.x = Math.random() * 1000 - 500;
            this.y = Math.random() * 1000 - 500;
            this.z = 1000;
            this.resetColor();
            this.opStat = null;
        }
    }

    draw() {
        const pos = [this.x, this.y, this.z];
        const rotated_pos = multiplyMatrixVector(viewMatrix, pos);
        if (rotated_pos[2] > 0) {
            const scale = focal_length / rotated_pos[2];
            this.lastX = rotated_pos[0] * scale + width / 2;
            this.lastY = rotated_pos[1] * scale + height / 2;
            this.lastSize = Math.max(1, scale * this.baseSize);
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.fillRect(this.lastX - this.lastSize / 2, this.lastY - this.lastSize / 2, this.lastSize, this.lastSize);
        }
    }
}

// Game State
const stars = Array.from({ length: 500 }, () => new Star());
const baseSpeed = 1.2;
const speedFactor = 1.2;
let speedLevel = 0;
let speed = baseSpeed * Math.pow(speedFactor, speedLevel);
const focal_length = 1000;
const expRewards = { 'white': 1, '#99FF66': 2, '#66FFFF': 4, '#9966FF': 8, '#FFD700': 50 }; // Aligned with old version

// View Control
let pitch = -0.48;
let yaw = 0;
const rotationSpeed = 0.004;
const dragSensitivity = 0.01;
let isDragging = false;
let startX, startY;
const keysPressed = {};

// Input Handling
function handleInput(x, y) {
    let hitStar = null;
    let minDistance = Infinity;

    for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        const dx = x - star.lastX;
        const dy = y - star.lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const precision = isTouchDevice ? mobilePrecision : desktopPrecision;
        const hitArea = star.lastSize * precision / 2;

        if (distance < hitArea) {
            hitStar = star;
            break;
        } else if (isTouchDevice && distance < minDistance) {
            minDistance = distance;
            hitStar = star;
        }
    }

    if (hitStar) {
        if (isTouchDevice && minDistance > hitStar.lastSize * mobilePrecision / 2) {
            if (minDistance > maxDistance || Math.random() > mobileNearMissChance) return;
        }
        catchSound.play();
        hitStar.assignOpStat();
        const reward = expRewards[hitStar.color] || 0;
        stars.splice(stars.indexOf(hitStar), 1);
        stars.push(new Star());
        openDialogue(hitStar.opStat, reward, x, y);
    }
}

function openDialogue(opStat, reward, x, y) {
    dialogue.style.left = `${Math.min(Math.max(x, 100), width - 100)}px`;
    dialogue.style.top = `${Math.min(Math.max(y, 100), height - 100)}px`;
    dialogue.style.display = 'block';
    statement.textContent = opStat.text;

    const handleResponse = (agreed) => {
        agreeBtn.removeEventListener('click', agreeHandler);
        disagreeBtn.removeEventListener('click', disagreeHandler);
        dialogue.style.display = 'none';
        (agreed ? agreeSound : disagreeSound).play();
        updateUserExp(userExp + reward); // Update for all players
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({ exp: userExp });
        }
    };

    const agreeHandler = () => handleResponse(true);
    const disagreeHandler = () => handleResponse(false);

    agreeBtn.addEventListener('click', agreeHandler);
    disagreeBtn.addEventListener('click', disagreeHandler);
}

// Touch Controls
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        handleInput(x, y);
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        yaw -= deltaX * dragSensitivity;
        pitch -= deltaY * dragSensitivity;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => isDragging = false);

// Desktop Controls
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    handleInput(e.clientX - rect.left, e.clientY - rect.top);
});

window.addEventListener('keydown', e => {
    keysPressed[e.code] = true;
    if (!e.repeat) {
        if (e.code === 'ArrowUp' && speedLevel < 3) speed = baseSpeed * Math.pow(speedFactor, ++speedLevel);
        if (e.code === 'ArrowDown' && speedLevel > -3) speed = baseSpeed * Math.pow(speedFactor, --speedLevel);
    }
});

window.addEventListener('keyup', e => keysPressed[e.code] = false);

// Leveling System (Reverted to Old Version)
function getExpForLevel(level) {
    if (level <= 0) return 0;
    if (level === 1) return 3;
    if (level === 2) return 10;
    if (level === 3) return 20;
    if (level === 4) return 50;
    return 50 + 50 * (level - 4);
}

function getLevel(exp) {
    if (exp < 3) return 0;
    if (exp < 10) return 1;
    if (exp < 20) return 2;
    if (exp < 50) return 3;
    return 4 + Math.floor((exp - 50) / 50);
}

function updateUserExp(newExp) {
    const previousLevel = getLevel(userExp);
    userExp = Math.max(0, newExp);
    if (getLevel(userExp) > previousLevel) levelUpSound.play();
}

// View Matrix
let viewMatrix;
function updateViewMatrix() {
    const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
    const R_x = [[1, 0, 0], [0, cosPitch, -sinPitch], [0, sinPitch, cosPitch]];
    const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
    const R_y = [[cosYaw, 0, sinYaw], [0, 1, 0], [-sinYaw, 0, cosYaw]];
    viewMatrix = transpose(multiplyMatrices(R_y, R_x));
}

// Animation Loop
let startTime = null;
let nextGoldSpawnTime = 45;

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;

    if (elapsed >= nextGoldSpawnTime) {
        const goldStar = new Star();
        goldStar.color = '#FFD700';
        if (stars.length >= 1000) stars.shift();
        stars.push(goldStar);
        nextGoldSpawnTime += 60;
    }

    ctx.clearRect(0, 0, width, height);

    if (keysPressed.KeyW) pitch += rotationSpeed;
    if (keysPressed.KeyS) pitch -= rotationSpeed;
    if (keysPressed.KeyA) yaw -= rotationSpeed;
    if (keysPressed.KeyD) yaw += rotationSpeed;

    pitch = Math.max(-0.78, Math.min(-0.18, pitch));
    yaw = Math.max(-0.3, Math.min(0.3, yaw));
    updateViewMatrix();

    stars.forEach(star => star.update(speed));
    stars.sort((a, b) => b.z - a.z);
    stars.forEach(star => star.draw());

    const level = getLevel(userExp);
    let progress;
    if (level === 0) {
        progress = userExp / 3;
    } else {
        const expForCurrentLevel = getExpForLevel(level);
        const expForNextLevel = getExpForLevel(level + 1);
        progress = (userExp - expForCurrentLevel) / (expForNextLevel - expForCurrentLevel);
    }

    levelText.textContent = `Level: ${level}`;
    progressFill.style.width = `${progress * 100}%`;

    if (opStatQueue.length < 3 && !isLoadingOpStats) loadOpStats();

    requestAnimationFrame(animate);
}

animate();