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
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
const firebaseuiContainer = document.getElementById('firebaseui-auth-container');

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
        loginButton.style.display = 'none';
        firebaseuiContainer.style.display = 'none';
        loadUserData(user.uid);
    } else {
        currentUser = null;
        userInfo.style.display = 'none';
        loginButton.style.display = 'block';
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

// Op-Stat queue management
let opStatQueue = [];

async function loadOpStats() {
    try {
        const querySnapshot = await db.collection("op-stats").get();
        const allOpStats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const shuffled = shuffleArray(allOpStats);
        opStatQueue = opStatQueue.concat(shuffled.slice(0, 20));
    } catch (error) {
        console.error('Error loading op-stats:', error);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

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

// Star class
class Star {
    constructor() {
        this.x = Math.random() * 1000 - 500;
        this.y = Math.random() * 1000 - 500;
        this.z = Math.random() * 1000;
        this.baseSize = Math.random() * 3 + 2;
        this.resetColorAndOpStat();
        this.lastX = undefined;
        this.lastY = undefined;
        this.lastSize = 0;
    }

    resetColorAndOpStat() {
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
        this.assignOpStat();
    }

    assignOpStat() {
        if (opStatQueue.length > 0) {
            this.opStat = opStatQueue.shift();
        } else {
            this.opStat = { text: "Loading...", id: "placeholder" };
            loadOpStats().then(() => {
                this.opStat = opStatQueue.shift() || this.opStat;
            });
        }
    }

    update(speed) {
        this.z -= speed;
        if (this.z < 1) {
            this.x = Math.random() * 1000 - 500;
            this.y = Math.random() * 1000 - 500;
            this.z = 1000;
            this.resetColorAndOpStat();
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
            if (streakFactor > 0 && this.lastX !== undefined && this.lastY !== undefined) {
                ctx.beginPath();
                ctx.moveTo(this.lastX, this.lastY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${streakFactor * 0.5})`;
                ctx.lineWidth = size / 2;
                ctx.stroke();
                size *= (1 + streakFactor); // Glow effect
            }
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
const stars = Array.from({ length: 1000 }, () => new Star());
const speed = 1;
const focal_length = 1000;

const expRewards = {
    '#FFD700': 100,
    'white': 1,
    '#99FF66': 2,
    '#66FFFF': 3,
    '#9966FF': 10
};

// View control variables
let pitch = -0.48;
let yaw = 0;
const rotationSpeed = 0.01;
let streakFactor = 0;
const keysPressed = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Backquote: false
};

// Event listeners for keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.code in keysPressed) {
        keysPressed[e.code] = true;
    }
    if (!e.repeat) { // Prevent continuous triggering when held
        switch (e.code) {
            case 'ArrowUp':
                updateUserExp(userExp + 100);
                break;
            case 'ArrowDown':
                updateUserExp(userExp - 100);
                break;
            case 'ArrowRight':
                updateUserExp((Math.floor(userExp / 100) + 1) * 100);
                break;
            case 'ArrowLeft':
                const currentLevel = Math.floor(userExp / 100);
                updateUserExp(currentLevel > 0 ? (currentLevel - 1) * 100 : 0);
                break;
            case 'Digit1':
                spawnGoldStar();
                break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keysPressed) {
        keysPressed[e.code] = false;
    }
});

// Update user experience and play level-up sound
function updateUserExp(newExp) {
    const previousLevel = Math.floor(userExp / 100);
    userExp = Math.max(0, newExp);
    const currentLevel = Math.floor(userExp / 100);
    if (currentLevel > previousLevel) {
        levelUpSound.play();
    }
}

// Spawn a gold star
function spawnGoldStar() {
    if (stars.length >= 1000) {
        stars.shift(); // Maintain star count
    }
    const goldStar = new Star();
    goldStar.color = '#FFD700';
    goldStar.assignOpStat();
    stars.push(goldStar);
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

// Click handler with login check commented out
canvas.addEventListener('click', (e) => {
    // Login requirement removed but code preserved for future use
    // if (!currentUser) {
    //     alert('Please log in to interact with the stars!');
    //     return;
    // }
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        const { lastX, lastY, lastSize } = star;
        if (clickX >= lastX - lastSize / 2 && clickX <= lastX + lastSize / 2 &&
            clickY >= lastY - lastSize / 2 && clickY <= lastY + lastSize / 2) {
            openDialogue(star, clickX, clickY);
            break;
        }
    }
});

function openDialogue(star, clickX, clickY) {
    statement.textContent = star.opStat.text;
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
        // Play sound effects based on response
        if (response === 'agree') {
            agreeSound.play();
        } else if (response === 'disagree') {
            disagreeSound.play();
        }
        const reward = expRewards[star.color] || 0;
        updateUserExp(userExp + reward);
        if (currentUser) {
            try {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                await userDocRef.update({ exp: userExp });
                await db.collection(`users/${currentUser.uid}/responses`).add({
                    opStatId: star.opStat.id,
                    response: response,
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Error updating user data:', error);
            }
        }
        dialogue.style.display = 'none';
        star.z = 0; // Remove star
        if (opStatQueue.length < 10) {
            loadOpStats();
        }
    };

    agreeBtn.onclick = () => onInteract('agree');
    disagreeBtn.onclick = () => onInteract('disagree');
}

// Animation loop
// Animation loop
function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update streak effect
    if (keysPressed.Backquote) {
        streakFactor = 1;
    } else {
        streakFactor = Math.max(0, streakFactor - 0.05);
    }

    // Adjust view with WASD
    if (keysPressed.KeyW) pitch -= rotationSpeed;
    if (keysPressed.KeyS) pitch += rotationSpeed;
    if (keysPressed.KeyA) yaw -= rotationSpeed;
    if (keysPressed.KeyD) yaw += rotationSpeed;

    // Limit pitch and yaw to a small range
    const minPitch = -0.48 - 0.3;  // 
    const maxPitch = -0.48 + 0.3;  // 
    const minYaw = -0.3;           // 
    const maxYaw = 0.3;            // 
    pitch = Math.max(minPitch, Math.min(maxPitch, pitch));
    yaw = Math.max(minYaw, Math.min(maxYaw, yaw));

    updateViewMatrix();

    stars.forEach(star => {
        star.update(speed);
        star.draw();
    });

    // Display level and progress bar
    const level = Math.floor(userExp / 100);
    const progress = (userExp % 100) / 100;
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${level}`, width - 10, 30);
    const barWidth = 100;
    const barHeight = 15;
    ctx.fillStyle = 'black';
    ctx.fillRect(width - 10 - barWidth, 35, barWidth, barHeight);
    ctx.fillStyle = 'gold';
    ctx.fillRect(width - 10 - barWidth, 35, barWidth * progress, barHeight);
    ctx.restore();

    requestAnimationFrame(animate);
}

animate();