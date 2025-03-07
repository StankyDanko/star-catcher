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

// Get UI elements
const loginButton = document.getElementById('login-button');
const loginContainer = document.getElementById('login-container');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const firebaseuiContainer = document.getElementById('firebaseui-auth-container');
const levelText = document.getElementById('level-text');
const progressFill = document.getElementById('progress-fill');

// User state
let currentUser = null;
let userExp = 0;

// Firebase UI configuration
const uiConfig = {
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.TwitterAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
        signInSuccessWithAuthResult: () => false
    }
};

// Initialize Firebase UI with retry logic
let retryCount = 0;
const MAX_RETRIES = 5;

function initFirebaseUI() {
    if (typeof firebaseui === 'undefined') {
        if (retryCount < MAX_RETRIES) {
            console.error('Firebase UI not loaded yet. Retrying in 1 second...');
            retryCount++;
            setTimeout(initFirebaseUI, 1000);
        } else {
            console.error('Failed to load Firebase UI after maximum retries.');
        }
        return;
    }
    const ui = new firebaseui.auth.AuthUI(auth);
    ui.start('#firebaseui-auth-container', uiConfig);
}

// Show login options
loginButton.addEventListener('click', () => {
    firebaseuiContainer.style.display = 'block';
    initFirebaseUI();
});

// Log out
logoutButton.addEventListener('click', () => {
    auth.signOut().catch((error) => {
        console.error('Logout failed:', error);
    });
});

// Track login state and load user data
auth.onAuthStateChanged((user) => {
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

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
            userExp = userDoc.data().exp || 0;
        } else {
            await userDocRef.set({ exp: 0 });
            userExp = 0;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Define the direction prefixes for all 20 directions
const directionPrefixes = [
    "mbti_e",       // MBTI Extraversion
    "mbti_i",       // MBTI Introversion
    "mbti_s",       // MBTI Sensing
    "mbti_n",       // MBTI Intuition
    "mbti_t",       // MBTI Thinking
    "mbti_f",       // MBTI Feeling
    "mbti_j",       // MBTI Judging
    "mbti_p",       // MBTI Perceiving
    "pol_left",     // Political Left-wing
    "pol_right",    // Political Right-wing
    "pol_auth",     // Political Authoritarian
    "pol_lib",      // Political Libertarian
    "media_char",   // Media Character-driven
    "media_plot",   // Media Plot-driven
    "media_depth",  // Media Emotional-depth
    "media_light",  // Media Light-heartedness
    "media_real",   // Media Realism
    "media_fantasy",// Media Fantasy
    "media_complex",// Media Complex
    "media_simple"  // Media Simple
];

// Op-Stat queue management
let opStatQueue = [];
let isLoadingOpStats = false;

// Utility function to shuffle an array (Fisher-Yates algorithm)
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
        // Generate random op-stat IDs (one per direction)
        const opStatIds = directionPrefixes.map(prefix => {
            const randomNumber = Math.floor(Math.random() * 50) + 1;
            return `${prefix}_${randomNumber}`;
        });

        // Fetch all 20 op-stats in parallel from Firestore
        const opStatDocs = await Promise.all(
            opStatIds.map(id => db.collection("op-stats").doc(id).get())
        );

        // Filter and map the fetched documents
        const fetchedOpStats = opStatDocs
            .filter(doc => doc.exists) // Ensure the document exists
            .map(doc => ({ id: doc.id, ...doc.data() }));

        // Shuffle and append to the queue
        opStatQueue = opStatQueue.concat(shuffleArray(fetchedOpStats));
    } catch (error) {
        console.error("Error loading op-stats:", error);
    } finally {
        isLoadingOpStats = false;
    }
}

// Initial load
loadOpStats();

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Dialogue elements
const dialogue = document.getElementById('dialogue');
const statement = document.getElementById('statement');
const agreeBtn = document.getElementById('agree');
const disagreeBtn = document.getElementById('disagree');

// Matrix utility functions
function multiplyMatrices(m1, m2) {
    let result = [[0,0,0], [0,0,0], [0,0,0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                result[i][j] += m1[i][k] * m2[k][j];
            }
        }
    }
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
    return [
        [m[0][0], m[1][0], m[2][0]],
        [m[0][1], m[1][1], m[2][1]],
        [m[0][2], m[1][2], m[2][2]]
    ];
}

// Sound effects
const agreeSound = new Audio('agree.webm');
const disagreeSound = new Audio('disagree.webm');
const levelUpSound = new Audio('lvl-up.webm');
const catchSound = new Audio('catch.webm');

// Star class
class Star {
    constructor() {
        this.x = Math.random() * 1000 - 500;
        this.y = Math.random() * 1000 - 500;
        this.z = Math.random() * 1000;
        this.baseSize = Math.random() * 6 + 3;
        this.resetColor(); // Only set color initially
        this.opStat = null; // No op-stat until clicked
        this.lastX = undefined;
        this.lastY = undefined;
        this.lastSize = 0;
    }

    resetColor() {
        const r = Math.random();
        if (r < 1 / 10800) {
            this.color = '#FFD700'; // Gold, rare
        } else if (r < 0.7) {
            this.color = 'white';   // White, common
        } else {
            const rColored = Math.random();
            if (rColored < 0.6667) {
                this.color = '#99FF66'; // Green
            } else if (rColored < 0.9) {
                this.color = '#66FFFF'; // Cyan
            } else {
                this.color = '#9966FF'; // Purple
            }
        }
    }

    assignOpStat() {
        if (opStatQueue.length > 0) {
            this.opStat = opStatQueue.shift();
        } else {
            this.opStat = { text: "Loading...", id: "placeholder" };
            if (!isLoadingOpStats) {
                loadOpStats().then(() => {
                    if (opStatQueue.length > 0) {
                        this.opStat = opStatQueue.shift();
                    }
                });
            }
        }
    }

    update(speed) {
        this.z -= speed;
        if (this.z < 1) {
            this.x = Math.random() * 1000 - 500;
            this.y = Math.random() * 1000 - 500;
            this.z = 1000;
            this.resetColor(); // Reset color only
            this.opStat = null; // Clear op-stat on reset
        }
    }

    draw() {
        const pos = [this.x, this.y, this.z];
        const rotated_pos = multiplyMatrixVector(viewMatrix, pos);
        if (rotated_pos[2] > 0) {
            const scale = focal_length / rotated_pos[2];
            const x = rotated_pos[0] * scale + width / 2;
            const y = rotated_pos[1] * scale + height / 2;
            let size = Math.max(1, scale * this.baseSize);
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
            this.lastX = x;
            this.lastY = y;
            this.lastSize = size;
        }
    }
}

// Game state
const stars = Array.from({ length: 500 }, () => new Star());
const baseSpeed = 1.2;
const speedFactor = 1.2;
let speedLevel = 0;
let speed = baseSpeed * Math.pow(speedFactor, speedLevel);
const focal_length = 1000;

const expRewards = {
    '#FFD700': 50,
    'white': 1,
    '#99FF66': 2,
    '#66FFFF': 4,
    '#9966FF': 8
};

// View control variables
let pitch = -0.48;
let yaw = 0;
const rotationSpeed = 0.004;
const keysPressed = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false
};

// Event listeners for keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.code in keysPressed) {
        keysPressed[e.code] = true;
    }
    if (!e.repeat) {
        switch (e.code) {
            case 'ArrowUp':
                if (speedLevel < 3) {
                    speedLevel++;
                    speed = baseSpeed * Math.pow(speedFactor, speedLevel);
                }
                break;
            case 'ArrowDown':
                if (speedLevel > -3) {
                    speedLevel--;
                    speed = baseSpeed * Math.pow(speedFactor, speedLevel);
                }
                break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keysPressed) {
        keysPressed[e.code] = false;
    }
});

// Leveling system functions
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

// Update user experience and play level-up sound
function updateUserExp(newExp) {
    const previousLevel = getLevel(userExp);
    userExp = Math.max(0, newExp);
    const currentLevel = getLevel(userExp);
    if (currentLevel > previousLevel) {
        levelUpSound.play();
    }
}

// Update view matrix based on pitch and yaw
let viewMatrix;
function updateViewMatrix() {
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const R_x = [
        [1, 0, 0],
        [0, cosPitch, -sinPitch],
        [0, sinPitch, cosPitch]
    ];
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const R_y = [
        [cosYaw, 0, sinYaw],
        [0, 1, 0],
        [-sinYaw, 0, cosYaw]
    ];
    const R = multiplyMatrices(R_y, R_x);
    viewMatrix = transpose(R);
}

// Click handler
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        const { lastX, lastY, lastSize } = star;
        if (clickX >= lastX - lastSize / 2 && clickX <= lastX + lastSize / 2 &&
            clickY >= lastY - lastSize / 2 && clickY <= lastY + lastSize / 2) {
            catchSound.play();
            star.assignOpStat(); // Assign op-stat only on click
            const reward = expRewards[star.color] || 0;
            stars.splice(i, 1);
            openDialogue(star.opStat, reward, clickX, clickY);
            break;
        }
    }
});

function openDialogue(opStat, reward, clickX, clickY) {
    statement.textContent = opStat.text;
    dialogue.style.display = 'block';
    const dialogueWidth = dialogue.offsetWidth;
    const dialogueHeight = dialogue.offsetHeight;
    let left = clickX - dialogueWidth / 2;
    let top = clickY + 50;
    if (left < 0) left = 0;
    if (left + dialogueWidth > width) left = width - dialogueWidth;
    if (top + dialogueHeight > height) top = height - dialogueHeight;
    dialogue.style.left = `${left}px`;
    dialogue.style.top = `${top}px`;

    const onInteract = async (response) => {
        if (response === 'agree') {
            agreeSound.play();
        } else if (response === 'disagree') {
            disagreeSound.play();
        }
        updateUserExp(userExp + reward);
        if (currentUser) {
            try {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                await userDocRef.update({ exp: userExp });
                await db.collection(`users/${currentUser.uid}/responses`).add({
                    opStatId: opStat.id,
                    response: response,
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Error updating user data:', error);
            }
        }
        dialogue.style.display = 'none';
    };

    agreeBtn.onclick = () => onInteract('agree');
    disagreeBtn.onclick = () => onInteract('disagree');
}

// Animation loop
let startTime = null;
let nextGoldSpawnTime = 45;

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;

    // Gold star spawning
    if (elapsed >= nextGoldSpawnTime) {
        const goldStar = new Star();
        goldStar.color = '#FFD700';
        // No op-stat assigned here; assigned on click
        if (stars.length >= 1000) stars.shift();
        stars.push(goldStar);
        nextGoldSpawnTime += 60;
    }

    ctx.clearRect(0, 0, width, height);

    // Adjust view with WASD
    if (keysPressed.KeyS) pitch -= rotationSpeed;
    if (keysPressed.KeyW) pitch += rotationSpeed;
    if (keysPressed.KeyA) yaw -= rotationSpeed;
    if (keysPressed.KeyD) yaw += rotationSpeed;

    // Limit pitch and yaw
    const minPitch = -0.48 - 0.3;
    const maxPitch = -0.48 + 0.3;
    const minYaw = -0.3;
    const maxYaw = 0.3;
    pitch = Math.max(minPitch, Math.min(maxPitch, pitch));
    yaw = Math.max(minYaw, Math.min(maxYaw, yaw));

    updateViewMatrix();

    // Update all stars
    stars.forEach(star => star.update(speed));

    // Sort stars by z-position
    stars.sort((a, b) => b.z - a.z);

    // Draw all stars
    stars.forEach(star => star.draw());

    // Calculate level and progress
    const level = getLevel(userExp);
    let progress;
    if (level === 0) {
        progress = userExp / 3;
    } else {
        const expForCurrentLevel = getExpForLevel(level);
        const expForNextLevel = getExpForLevel(level + 1);
        progress = (userExp - expForCurrentLevel) / (expForNextLevel - expForCurrentLevel);
    }

    // Update stat-box
    levelText.textContent = `Level: ${level}`;
    progressFill.style.width = `${progress * 100}%`;

    // Refill op-stat queue if low
    if (opStatQueue.length < 3 && !isLoadingOpStats) {
        loadOpStats();
    }

    requestAnimationFrame(animate);
}

animate();