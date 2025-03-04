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

// Opinion statements (replace with your political-compass data)
const opStats = [
    "Everyone deserves a second chance.",
    "Hard work should always be rewarded.",
    "Sometimes rules need to be bent for the greater good.",
    "Tradition keeps society strong.",
    "Change is usually a good thing."
];

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
        matrix[0][0]*vector[0] + matrix[0][1]*vector[1] + matrix[0][2]*vector[2],
        matrix[1][0]*vector[0] + matrix[1][1]*vector[1] + matrix[1][2]*vector[2],
        matrix[2][0]*vector[0] + matrix[2][1]*vector[1] + matrix[2][2]*vector[2]
    ];
}

function transpose(m) {
    return [
        [m[0][0], m[1][0], m[2][0]],
        [m[0][1], m[1][1], m[2][1]],
        [m[0][2], m[1][2], m[2][2]]
    ];
}

class Star {
    constructor() {
        this.x = Math.random() * 1000 - 500;
        this.y = Math.random() * 1000 - 500;
        this.z = Math.random() * 1000;
        this.baseSize = Math.random() * 1 + 0.5; // Size range 0.5 to 1.5
        this.resetColorAndOpStat();
        this.lastX = 0;
        this.lastY = 0;
        this.lastSize = 0;
    }

    resetColorAndOpStat() {
        const r = Math.random();
        if (r < 1 / 10800) { // Golden star, ~once every 180s
            this.color = '#FFD700';
            this.opStat = null;
        } else if (r < 0.7) { // White stars, 70%
            this.color = 'white';
            this.opStat = null;
        } else { // Colored stars, 30%
            const rColored = Math.random();
            if (rColored < 0.6667) { // 20% of total
                this.color = '#99FF66';
            } else if (rColored < 0.9) { // 7% of total
                this.color = '#66FFFF';
            } else { // 3% of total
                this.color = '#9966FF';
            }
            this.opStat = opStats[Math.floor(Math.random() * opStats.length)];
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
            const size = Math.max(1, scale * this.baseSize); // No glowFactor
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
const speed = 1; // Matches original speed
const focal_length = 1000; // Matches original focal length
let score = 0;
const rewards = {
    '#99FF66': 1,
    '#66FFFF': 2,
    '#9966FF': 4
};

// Fixed view matrix (no user rotation, slight downward tilt like "falling to earth")
const pitch = -0.48; // Adjust if too steep or flat
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
        if (star.color === 'white') continue;

        const { lastX, lastY, lastSize } = star;
        if (clickX >= lastX - lastSize / 2 && clickX <= lastX + lastSize / 2 &&
            clickY >= lastY - lastSize / 2 && clickY <= lastY + lastSize / 2) {
            if (star.color === '#FFD700') {
                score += 10;
                star.z = 0; // Remove golden star
            } else {
                openDialogue(star);
            }
            break;
        }
    }
});

function openDialogue(star) {
    statement.textContent = star.opStat;
    dialogue.style.display = 'block';

    const onInteract = () => {
        score += rewards[star.color];
        dialogue.style.display = 'none';
        star.z = 0; // Remove star after interaction
        agreeBtn.removeEventListener('click', onInteract);
        disagreeBtn.removeEventListener('click', onInteract);
    };

    agreeBtn.addEventListener('click', onInteract);
    disagreeBtn.addEventListener('click', onInteract);
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, width, height); // Full clear like original

    stars.forEach(star => {
        star.update(speed);
        star.draw();
    });

    // Draw score
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${score}`, width - 10, 30);
    ctx.restore();

    requestAnimationFrame(animate);
}

animate();