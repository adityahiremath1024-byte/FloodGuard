/**
 * FloodGuard - Ambient Particles & Shooting Stars Canvas Effect
 * Renders atmospheric shooting stars and particle effects layered over the WebGL background.
 */

(function initStarsFX() {
    const fxCanvas = document.getElementById('fx');
    if (!fxCanvas) return;

    const ctx = fxCanvas.getContext('2d');
    let width, height;

    function handleResize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        width = fxCanvas.width = Math.round(window.innerWidth * dpr);
        height = fxCanvas.height = Math.round(window.innerHeight * dpr);
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // Particle curve generation
    function curve(side, t, time) {
        const u = side < 0 ? t : 1.0 - t; // 0 at screen edge
        const bx = u * 0.46;
        const by = 0.40 - u * 0.16 + Math.sin(u * 7.0 + time * 0.35) * 0.045 * (1.0 - u * 0.4) + Math.sin(u * 13.0 - time * 0.5) * 0.012;
        return [side < 0 ? bx : 1.0 - bx, by];
    }

    // Particle list
    const N = 0;
    const particles = [];
    for (let i = 0; i < N; i++) {
        const side = i % 2 ? 1 : -1;
        particles.push({
            side,
            t: Math.random(),
            o: (Math.random() + Math.random() + Math.random() - 1.5) * 0.9,
            r: 0.5 + Math.random() * 1.6,
            ph: Math.random() * 6.28,
            sp: 0.6 + Math.random() * 1.8,
            l: Math.random()
        });
    }

    // Shooting stars array and spawning
    const stars = [];

    function spawnShootingStar() {
        stars.push({
            x: Math.random() * 0.7 + 0.1,
            y: Math.random() * 0.3,
            vx: 0.5 + Math.random() * 0.4,
            vy: 0.18 + Math.random() * 0.15,
            life: 0
        });
    }

    let nextShot = 2.0;
    let lastTime = performance.now();
    let totalTime = 0;

    function renderLoop(currentTime) {
        const dt = (currentTime - lastTime) / 1000.0;
        lastTime = currentTime;
        totalTime += dt;

        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        const scale = height / 1080.0;

        // Render ambient particles along curves
        for (const p of particles) {
            const [cx, cy] = curve(p.side, p.t, totalTime);
            const e = 0.002;
            const [ax, ay] = curve(p.side, p.t + e, totalTime);
            let nx = -(ay - cy);
            let ny = ax - cx;
            const len = Math.hypot(nx, ny) || 1;
            nx /= len;
            ny /= len;

            const offset = p.o * 0.1 * (0.35 + (p.side < 0 ? p.t : 1.0 - p.t) * 0.9);
            const px = (cx + nx * offset * (height / width)) * width;
            const py = (cy + ny * offset) * height;
            const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(totalTime * p.sp + p.ph));
            const fade = Math.min(1.0, (p.side < 0 ? 1.0 - p.t : p.t) * 3.2 + 0.1) * (1.0 - Math.min(1.0, Math.abs(p.o) * 0.35));
            const isBlue = p.side < 0;

            ctx.fillStyle = isBlue
                ? `rgba(${70 + (p.l * 80 | 0)}, ${150 + (p.l * 60 | 0)}, 255, ${0.75 * twinkle * fade})`
                : `rgba(255, ${90 + (p.l * 90 | 0)}, ${40 + (p.l * 40 | 0)}, ${0.75 * twinkle * fade})`;

            ctx.beginPath();
            ctx.arc(px, py, p.r * scale * 1.3, 0, 6.283);
            ctx.fill();

            if (p.r > 1.7) {
                ctx.fillStyle = isBlue
                    ? `rgba(90, 170, 255, ${0.12 * twinkle * fade})`
                    : `rgba(255, 120, 50, ${0.12 * twinkle * fade})`;
                ctx.beginPath();
                ctx.arc(px, py, p.r * scale * 5.0, 0, 6.283);
                ctx.fill();
            }
        }

        // Spawn shooting stars periodically
        nextShot -= dt;
        if (nextShot < 0) {
            spawnShootingStar();
            nextShot = 3.0 + Math.random() * 6.0;
        }

        // Render shooting stars with gradients
        for (let i = stars.length - 1; i >= 0; i--) {
            const s = stars[i];
            s.life += dt;
            s.x += s.vx * dt * 0.9;
            s.y += s.vy * dt * 0.9;

            const alpha = Math.max(0, 1.0 - s.life / 1.1);
            if (alpha <= 0) {
                stars.splice(i, 1);
                continue;
            }

            const startX = s.x * width;
            const startY = s.y * height;
            const tailX = startX - s.vx * width * 0.14;
            const tailY = startY - s.vy * height * 0.14 * (width / height) * 0.56;

            const gradient = ctx.createLinearGradient(startX, startY, tailX, tailY);
            gradient.addColorStop(0, `rgba(220, 240, 255, ${alpha})`);
            gradient.addColorStop(1, 'rgba(120, 180, 255, 0)');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.2 * scale;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
})();
