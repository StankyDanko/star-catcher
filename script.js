const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const width = canvas.width;
const height = canvas.height;

// Dialogue elements
const dialogue = document.getElementById('dialogue');
const statement = document.getElementById('statement');
const agreeBtn = document.getElementById('agree');
const disagreeBtn = document.getElementById('disagree');

// Opinion statements (placeholders, replace with your political-compass data)
const opStats = [
    "Everyone deserves a second chance.",
    "Hard work should always be rewarded.",
    "Sometimes rules need to be bent for the greater good.",
    "Tradition keeps society strong.",
    "Change is usually a good thing."
];

// Star class
class Star {
    constructor() {
        this.x = Math.random() * 2000 - 1000;
        this.y = Math.random() * 2000 - 1000;
        this.z = Math.random() * 1000;
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

    update() {
        this.z -= 1; // Speed of falling
        if (this.z < 1) {
            this.z = 1000;
            this.x = Math.random() * 2000 - 1000;
            this.y = Math.random() * 2000 - 1000;
            this.resetColorAndOpStat();
        }
    }

    draw() {
        const scale = 1000 / this.z;
        const x = this.x * scale + width / 2;
        const y = this.y * scale + height / 2;
        const size = 2 * scale;

        // Glow effect for golden stars
        if (this.color === '#FFD700') {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            const glowSize = size * 2;
            ctx.fillRect(x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);

        this.lastX = x;
        this.lastY = y;
        this.lastSize = size;
    }
}

// Game state
const stars = Array.from({ length: 1000 }, () => new Star());
let pitch = -0.48; // Fixed pitch after 8s of 'W'
let yaw = 0;
let score = 0;
const rewards = {
    '#99FF66': 1,
    '#66FFFF': 2,
    '#9966FF': 4
};

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
                star.z = 0; // Remove golden star after click
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Apply rotation
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    stars.forEach(star => {
        // Rotate around x-axis (pitch)
        const y1 = star.y * cosP - star.z * sinP;
        const z1 = star.y * sinP + star.z * cosP;
        // Rotate around y-axis (yaw, fixed at 0)
        const x = star.x * cosY + z1 * sinY;
        const z = -star.x * sinY + z1 * cosY;
        star.y = y1;
        star.z = z;

        star.update();
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