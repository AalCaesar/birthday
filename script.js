const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width = 0;
let height = 0;
let centerX = 0;
let centerY = 0;
let dpr = 1;
let angle = 0;
let camera = 0;

const particles = [];
const stars = [];
const sparkles = [];

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function heartPoint(t) {
    return {
        x: 16 * Math.pow(Math.sin(t), 3),
        y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    };
}

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createStars();
    createSparkles();
    createHeart();
}

function createHeart() {
    particles.length = 0;

    const total = reduceMotion ? 700 : clamp(Math.floor((width * height) / 520), 1200, 2400);

    for (let i = 0; i < total; i++) {
        const t = random(0, Math.PI * 2);
        const point = heartPoint(t);
        const fill = Math.sqrt(Math.random());

        particles.push({
            x: point.x * fill,
            y: -point.y * fill,
            z: random(-9, 9),
            size: random(0.8, 2.2),
            phase: random(0, Math.PI * 2),
            speed: random(0.6, 1.4),
            alpha: random(0.36, 1)
        });
    }
}

function createStars() {
    stars.length = 0;

    const total = reduceMotion ? 90 : clamp(Math.floor((width * height) / 4500), 120, 260);

    for (let i = 0; i < total; i++) {
        stars.push({
            x: random(0, width),
            y: random(0, height),
            radius: random(0.5, 1.9),
            alpha: random(0.2, 0.9),
            phase: random(0, Math.PI * 2),
            speed: random(0.4, 1.6)
        });
    }
}

function createSparkles() {
    sparkles.length = 0;

    for (let i = 0; i < 32; i++) {
        sparkles.push({
            x: random(-1, 1),
            y: random(-1, 1),
            radius: random(120, 340),
            size: random(1.2, 3.5),
            phase: random(0, Math.PI * 2),
            speed: random(0.15, 0.45)
        });
    }
}

function drawBackground() {
    ctx.fillStyle = "rgba(4, 0, 8, 0.24)";
    ctx.fillRect(0, 0, width, height);
}

function drawStars(time) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(255, 255, 255, 0.7)";

    stars.forEach((star) => {
        const alpha = clamp(star.alpha + Math.sin(time * star.speed + star.phase) * 0.25, 0.08, 1);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 245, ${alpha})`;
        ctx.fill();
    });

    ctx.restore();
}

function drawHeart(time) {
    const heartScale = Math.min(width, height) * 0.033;
    const perspective = Math.min(width, height) * 0.78;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#ff0f5f";

    particles.forEach((particle) => {
        const x = particle.x * heartScale;
        const y = particle.y * heartScale;
        const z = particle.z * heartScale;
        const rotatedX = x * Math.cos(camera) - z * Math.sin(camera);
        const rotatedZ = x * Math.sin(camera) + z * Math.cos(camera);
        const scale = perspective / (perspective + rotatedZ);

        if (scale <= 0) {
            return;
        }

        const floatY = Math.sin(time * particle.speed + particle.phase) * 8;
        const px = centerX + rotatedX * scale;
        const py = centerY + (y + floatY) * scale;
        const alpha = clamp(particle.alpha * scale, 0.15, 0.95);

        ctx.beginPath();
        ctx.arc(px, py, particle.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 45, 105, ${alpha})`;
        ctx.fill();
    });

    ctx.restore();
}

function drawRing(time) {
    if (width < 480) {
        return;
    }

    const text = "  HAPPY BIRTHDAY • I LOVE YOU  ";
    const radius = Math.min(width, height) * 0.31;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle * 0.55);
    ctx.font = `700 ${clamp(width * 0.018, 16, 24)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff0f5f";

    for (let i = 0; i < text.length; i++) {
        const letterAngle = (Math.PI * 2 / text.length) * i;
        const pulse = Math.sin(time + i * 0.4) * 0.08 + 1;
        const x = Math.cos(letterAngle) * radius * pulse;
        const y = Math.sin(letterAngle) * radius * pulse;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(letterAngle + Math.PI / 2);
        ctx.fillStyle = "rgba(255, 180, 205, 0.9)";
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }

    ctx.restore();
}

function drawSparkles(time) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    sparkles.forEach((item) => {
        const orbit = item.radius + Math.sin(time * item.speed + item.phase) * 24;
        const x = centerX + item.x * orbit + Math.cos(time * item.speed + item.phase) * 40;
        const y = centerY + item.y * orbit + Math.sin(time * item.speed + item.phase) * 40;
        const alpha = clamp(0.42 + Math.sin(time * 2 + item.phase) * 0.3, 0.12, 0.86);

        ctx.beginPath();
        ctx.moveTo(x - item.size * 2, y);
        ctx.lineTo(x + item.size * 2, y);
        ctx.moveTo(x, y - item.size * 2);
        ctx.lineTo(x, y + item.size * 2);
        ctx.strokeStyle = `rgba(255, 220, 235, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#ffffff";
        ctx.stroke();
    });

    ctx.restore();
}

function animate() {
    const time = performance.now() / 1000;
    const motionSpeed = reduceMotion ? 0.25 : 1;

    angle += 0.007 * motionSpeed;
    camera += 0.0048 * motionSpeed;

    drawBackground();
    drawStars(time);
    drawSparkles(time);
    drawHeart(time);
    drawRing(time);

    requestAnimationFrame(animate);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
animate();
