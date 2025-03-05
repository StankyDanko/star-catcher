// Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXaY6hn6NDJI6WEy1mvtGRXl6V5_W7HJs",
    authDomain: "sd-opinion-statements.firebaseapp.com",
    projectId: "sd-opinion-statements",
    storageBucket: "sd-opinion-statements.firebasestorage.app",
    messagingSenderId: "702007524321",
    appId: "1:702007524321:web:9b25faa3203a3b621af0a0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Op-Stat queue management
let opStatQueue = [];

async function loadOpStats() {
    const querySnapshot = await getDocs(collection(db, "op-stats"));
    const allOpStats = querySnapshot.docs.map(doc => doc.data());
    const shuffled = shuffleArray(allOpStats);
    opStatQueue = opStatQueue.concat(shuffled.slice(0, 20));
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Load initial op-stats when the game starts
loadOpStats();

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

// Star class
class Star {
    constructor() {
        this.x = Math.random() * 1000 - 500;
        this.y = Math.random() * 1000 - 500;
        this.z = Math.random() * 1000;
        this.baseSize = Math.random() * 3 + 2;
        this.resetColorAndOpStat();
        this.lastX = 0;
        this.lastY = 0;
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
            this.opStat = { text: "Loading...", type: "placeholder" };
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
            const size = Math.max(1, scale * this.baseSize);
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
let exp = 0;

const expRewards = {
    '#FFD700': 100,  // Gold: 100 exp
    'white': 1,      // White: 1 exp
    '#99FF66': 2,    // Green: 2 exp
    '#66FFFF': 3,    // Cyan: 3 exp
    '#9966FF': 10    // Purple: 10 exp
};

// Fixed view matrix with slight downward tilt
const pitch = -0.48;
const yaw = 0;
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
const viewMatrix = transpose(R);

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
    let top = clickY + 50; // 50 pixels below the click
    if (left < 0) left = 0;
    if (left + dialogueWidth > width) left = width - dialogueWidth;
    if (top + dialogueHeight > height) top = height - dialogueHeight;
    dialogue.style.left = `${left}px`;
    dialogue.style.top = `${top}px`;

    const onInteract = () => {
        exp += expRewards[star.color] || 0;
        dialogue.style.display = 'none';
        star.z = 0; // Remove star
        agreeBtn.removeEventListener('click', onInteract);
        disagreeBtn.removeEventListener('click', onInteract);
        if (opStatQueue.length < 10) {
            loadOpStats();
        }
    };

    agreeBtn.addEventListener('click', onInteract);
    disagreeBtn.addEventListener('click', onInteract);
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, width, height);

    stars.forEach(star => {
        star.update(speed);
        star.draw();
    });

    // Display level and progress bar
    const level = Math.floor(exp / 100);
    const progress = (exp % 100) / 100;
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