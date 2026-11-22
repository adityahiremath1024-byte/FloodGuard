/**
 * FloodGuard - Rotating Earth WebGL Shader Implementation
 * Renders an atmospheric 3D rotating Earth with day/night cycles, city lights, relief mapping, and clouds.
 */

// Fragment Shader Source
const FS = `
precision highp float;

uniform vec2 R;          // Viewport Resolution
uniform float T;         // Elapsed Time
uniform sampler2D D;     // Day Texture
uniform sampler2D N;     // Night Texture

// 3D Hash
float h(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// 3D Value Noise
float n3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(h(i), h(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(h(i + vec3(0.0, 1.0, 0.0)), h(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(h(i + vec3(0.0, 0.0, 1.0)), h(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(h(i + vec3(0.0, 1.0, 1.0)), h(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
        f.z
    );
}

// Fractal Brownian Motion (5 octaves)
float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) {
        s += a * n3(p);
        p = p * 2.03 + 1.7;
        a *= 0.5;
    }
    return s;
}

// Rotation matrices
vec3 rx(vec3 v, float a) {
    float c = cos(a), s = sin(a);
    return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
}

vec3 rz(vec3 v, float a) {
    float c = cos(a), s = sin(a);
    return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z);
}

vec3 ry(vec3 v, float a) {
    float c = cos(a), s = sin(a);
    return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

// Global network / city points
vec3 city(float k) {
    vec2 l;
    if (k < 0.5) l = vec2(28.6, 77.2);
    else if (k < 1.5) l = vec2(19.0, 72.8);
    else if (k < 2.5) l = vec2(13.0, 77.6);
    else if (k < 3.5) l = vec2(25.2, 55.3);
    else if (k < 4.5) l = vec2(30.0, 31.2);
    else if (k < 5.5) l = vec2(41.0, 29.0);
    else if (k < 6.5) l = vec2(55.7, 37.6);
    else if (k < 7.5) l = vec2(39.9, 116.4);
    else if (k < 8.5) l = vec2(1.35, 103.8);
    else if (k < 9.5) l = vec2(35.7, 139.7);
    else if (k < 10.5) l = vec2(-1.3, 36.8);
    else if (k < 11.5) l = vec2(51.5, -0.1);
    else l = vec2(6.5, 3.4);
    
    l *= 0.0174533; // Convert degrees to radians
    return vec3(cos(l.x) * sin(l.y), sin(l.x), cos(l.x) * cos(l.y));
}

// Network arcs and pulse rings
vec2 net(vec3 p, float T) {
    float arc = 0.0;
    float ring = 0.0;
    for (int i = 0; i < 13; i++) {
        float fi = float(i);
        vec3 a = city(fi);
        float ang = acos(clamp(dot(p, a), -1.0, 1.0));
        float ph = fract(T * 0.28 + fi * 0.173);
        float rr = ph * 0.07;
        float q1 = (ang - rr) / 0.004;
        ring += exp(-ang * ang / 0.00004) * 1.5 + exp(-q1 * q1) * (1.0 - ph) * (1.0 - ph) * 0.9;
        
        vec3 b = city(mod(fi * 5.0 + 3.0, 13.0));
        vec3 nm = cross(a, b);
        float nl = length(nm);
        if (nl > 0.05) {
            nm /= nl;
            float off = abs(dot(p, nm));
            if (off < 0.06) {
                vec3 pr = normalize(p - nm * dot(p, nm));
                float tot = acos(clamp(dot(a, b), -1.0, 1.0));
                float t = atan(dot(pr, normalize(cross(nm, a))), dot(pr, a)) / tot;
                if (t > 0.0 && t < 1.0) {
                    float fade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.95, t);
                    float d = fract(fract(T * 0.11 + fi * 0.37) - t);
                    float tr = exp(-d * 6.0) * step(d, 0.6);
                    float spike = exp(-d * d * 2500.0);
                    float core = exp(-off * off / 0.0000065);
                    float soft = exp(-off / 0.01);
                    arc += fade * (core * (0.35 + tr * 1.6 + spike * 2.0) + soft * (0.06 + tr * 0.35 + spike * 0.5));
                }
            }
        }
    }
    return vec2(arc, ring);
}

// Luminance calculation
float lum(vec3 c) {
    return dot(c, vec3(0.3, 0.59, 0.11));
}

// Spherical coordinates mapping
vec2 sph(vec3 q, float off) {
    return vec2(
        atan(q.x, q.z) / 6.2831853 + 0.5 + off,
        0.5 - asin(clamp(q.y, -1.0, 1.0)) / 3.14159265
    );
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * R) / R.y;
    vec3 rd = normalize(vec3(uv, -1.6));
    vec3 c = vec3(0.0, -3.5, -4.2);
    float Rr = 3.0;
    vec3 oc = -c;
    float b = dot(oc, rd);
    float disc = b * b - (dot(oc, oc) - Rr * Rr);
    vec3 sun = normalize(vec3(0.95, 0.12, -0.15));
    
    // Space background gradient
    vec3 col = vec3(0.004, 0.009, 0.024) + vec3(0.0, 0.008, 0.025) * (uv.y + 0.5);
    
    // Distant background star layers
    vec2 g1 = gl_FragCoord.xy / (R.y / 540.0 * 1.6);
    float s = h(vec3(floor(g1), 1.0));
    col += step(0.9965, s) * smoothstep(0.5, 0.15, length(fract(g1) - 0.5)) * (0.45 + 0.55 * sin(T * 1.5 + s * 80.0)) * vec3(0.8, 0.9, 1.0);
    
    vec2 g2 = gl_FragCoord.xy / (R.y / 540.0 * 4.0);
    float s2 = h(vec3(floor(g2), 7.0));
    col += step(0.992, s2) * smoothstep(0.5, 0.0, length(fract(g2) - 0.5)) * 0.55 * (0.7 + 0.3 * sin(T * 2.0 + s2 * 60.0)) * mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.8, 0.6), fract(s2 * 91.0)) * 1.0;
    
    // Outer atmospheric glow / halo
    float dist = length(oc - rd * b);
    vec3 cp = normalize(oc - rd * b);
    float ex = max(dist - Rr, 0.0);
    float halo = exp(-ex * 6.0) * 0.55 + exp(-ex * 26.0) * 1.0 + exp(-ex * 85.0) * 1.8;
    col += halo * mix(vec3(0.04, 0.2, 0.65), vec3(0.35, 0.7, 1.0), smoothstep(-0.3, 0.8, dot(cp, sun)));
    col += exp(-ex * 45.0) * vec3(1.0, 0.5, 0.15) * 1.1 * smoothstep(0.55, 1.0, dot(cp, sun));

    // Earth Sphere intersection
    if (disc > 0.0 && b < 0.0) {
        float t = -b - sqrt(disc);
        vec3 n = normalize(rd * t + oc);
        vec3 q = rz(rx(n, -1.3), 0.3);
        float spin = T * 0.008;
        vec2 tc = sph(q, 0.78 - spin);
        
        vec3 dayc = texture2D(D, tc).rgb;
        vec3 nit = texture2D(N, tc).rgb;
        float d = dot(n, sun);
        float water = clamp((dayc.b - dayc.r * 1.4 - 0.02) * 6.0, 0.0, 1.0);
        
        float sp = 6.2831853 * (0.78 - spin);
        vec3 qt = ry(q, sp);
        vec3 sq = ry(rz(rx(sun, -1.3), 0.3), sp);
        vec3 ea = normalize(vec3(qt.z, 0.0, -qt.x));
        vec3 no = cross(qt, ea);
        
        // Relief & normal simulation from daytime texture
        float gE = lum(texture2D(D, tc + vec2(1.5 / 4096.0, 0.0)).rgb) - lum(texture2D(D, tc - vec2(1.5 / 4096.0, 0.0)).rgb);
        float gN = -(lum(texture2D(D, tc + vec2(0.0, 1.5 / 2048.0)).rgb) - lum(texture2D(D, tc - vec2(0.0, 1.5 / 2048.0)).rgb));
        float relief = 1.0 - 9.0 * (gE * dot(sq, ea) + gN * dot(sq, no));
        float landm = 1.0 - clamp((dayc.b - dayc.r * 1.4 - 0.02) * 6.0, 0.0, 1.0);
        
        float det = fbm(qt * 140.0) * 0.6 + fbm(qt * 420.0) * 0.4;
        float ridge = 1.0 - abs(fbm(qt * 60.0 + 4.0) * 2.0 - 1.0);
        
        vec3 surf = dayc * 1.5;
        surf = mix(vec3(lum(surf)), surf, 1.3);
        surf *= 1.0 + landm * ((det - 0.5) * 0.9 + (ridge - 0.5) * 0.35);
        surf *= 1.0 + landm * clamp(relief - 1.0, -0.6, 0.8) * 1.2;
        surf = mix(surf, surf * vec3(0.9, 1.15, 1.6) + vec3(0.0, 0.02, 0.05), water * 0.7);

        // Procedural atmospheric clouds
        vec3 cq = rz(rx(n, -1.3), 0.3);
        float a = -T * 0.011;
        cq = vec3(cq.x * cos(a) + cq.z * sin(a), cq.y, -cq.x * sin(a) + cq.z * cos(a));
        float cl = smoothstep(0.5, 0.8, fbm(cq * 3.2 + 9.0) * 0.75 + fbm(cq * 9.0) * 0.35 * 0.5 + fbm(cq * 28.0) * 0.12);
        float cir = smoothstep(0.55, 0.9, fbm(cq * vec3(2.0, 7.0, 2.0) + 3.0));
        cl = clamp(cl + cir * 0.35, 0.0, 1.0);
        float csh = smoothstep(0.5, 0.8, fbm((cq + sun * 0.03) * 3.2 + 9.0) * 0.75 + fbm((cq + sun * 0.03) * 9.0) * 0.17);
        float lit = max(d, 0.0);
        
        vec3 day_col = surf * (1.0 - 0.5 * csh * (1.0 - cl)) * (0.03 + 0.95 * lit) + vec3(1.0) * cl * 0.8 * (0.05 + 1.1 * lit);
        float sd = max(dot(reflect(rd, n), sun), 0.0);
        float spec = (pow(sd, 60.0) * 1.1 + pow(sd, 8.0) * 0.14) * water * (1.0 - cl);
        
        // Night side city lights & aurora
        float night = 1.0 - smoothstep(-0.12, 0.14, d);
        vec3 lights = nit * vec3(2.4, 1.7, 1.0) * night * (1.0 - cl * 0.8) * (0.75 + 0.5 * n3(vec3(tc * 1200.0, T * 0.9)));
        vec3 bl = vec3(0.0), bl2 = vec3(0.0);
        for (int i = 0; i < 8; i++) {
            float an = float(i) * 0.785398;
            vec2 o = vec2(cos(an) / 4096.0, sin(an) / 2048.0);
            bl += texture2D(N, tc + o * 7.0).rgb;
            bl2 += texture2D(N, tc + o * 18.0).rgb;
        }
        bl /= 8.0;
        bl2 /= 8.0;
        float pul = 0.7 + 0.3 * sin(T * 1.2 + h(vec3(floor(qt * 30.0))) * 6.28);
        lights += (bl + bl2 * 0.8) * vec3(1.0, 0.72, 0.38) * night * (1.0 - cl * 0.7) * pul * 0.6;
        
        // Lightning flashes in clouds
        float fl = T * 1.1;
        float lid = h(floor(cq * 4.0) + floor(fl) * 7.3);
        float fire = step(0.97, lid) * exp(-fract(fl) * 7.0);
        lights += vec3(0.75, 0.85, 1.0) * fire * cl * night * smoothstep(0.3, 1.0, fbm(cq * 10.0)) * 0.6;
        
        // Global connectivity network arcs
        vec2 nw = net(qt, T);
        lights += (nw.x * vec3(1.0, 0.78, 0.42) * 0.6 + nw.y * vec3(0.85, 0.97, 1.0) * 0.55) * (0.5 + 0.8 * night) * (1.0 - cl * 0.65);
        
        // Twilight / terminator scattering & atmosphere rim
        vec3 tw = exp(-(d * 5.5) * (d * 5.5)) * vec3(1.0, 0.42, 0.12) * 0.22;
        float fr = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 atm = vec3(0.14, 0.5, 1.0) * (fr * (0.35 + 1.7 * smoothstep(-0.4, 0.6, d)) + pow(1.0 - max(dot(n, -rd), 0.0), 9.0) * 2.2);
        
        col = day_col * smoothstep(-0.25, 0.1, d + 0.12) + vec3(0.012, 0.02, 0.045) * (1.0 - smoothstep(-0.3, 0.1, d)) * (surf.b + 0.3) + spec + lights + tw + atm;
        col *= 0.9;
    }

    // Lens Flare & Tone Mapping
    float fd = length(uv - vec2(0.56, -0.27));
    col += exp(-fd * 7.0) * vec3(1.0, 0.6, 0.25) * 0.6 + exp(-fd * 30.0) * vec3(1.0, 0.8, 0.5) * 0.9 + exp(-abs(uv.y + 0.27) * 55.0) * exp(-abs(uv.x - 0.56) * 2.2) * vec3(1.0, 0.55, 0.2) * 0.45;
    col *= 1.0 - 0.55 * dot(uv * 0.9, uv * 0.9);
    col *= 0.99;
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    
    float lm = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col * vec3(0.9, 1.0, 1.12), col * vec3(1.08, 1.0, 0.9), smoothstep(0.15, 0.7, lm));
    col += (h(vec3(gl_FragCoord.xy, floor(T * 24.0))) - 0.5) * 0.035;
    
    gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.9)), 1.0);
}
`;

// Vertex Shader Source
const VS = `
attribute vec2 a;
void main() {
    gl_Position = vec4(a, 0.0, 1.0);
}
`;

// Initialize WebGL Context and Rendering
(function initEarth() {
    const canvas = document.getElementById('c');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');

    function showErr(msg) {
        let errEl = document.getElementById('err');
        if (!errEl) {
            errEl = document.createElement('pre');
            errEl.id = 'err';
            document.body.appendChild(errEl);
        }
        errEl.textContent += msg + '\n';
    }

    if (!gl) {
        showErr('WebGL is not available in your browser.');
        return;
    }

    // Shader compilation utility
    function compileShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            showErr('Shader compile error: ' + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    // Program creation & linking
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        showErr('Shader link error: ' + gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    // Fullscreen single triangle buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uR = gl.getUniformLocation(program, 'R');
    const uT = gl.getUniformLocation(program, 'T');

    // Viewport resize handling (optimized for smooth 60fps)
    function resizeViewport() {
        const want4k = /res=4k/.test(location.search);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        const targetWidth = want4k ? 3840 : Math.min(window.innerWidth * dpr, 1920);
        const scale = targetWidth / window.innerWidth;
        canvas.width = Math.round(window.innerWidth * scale);
        canvas.height = Math.round(window.innerHeight * scale);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeViewport);
    resizeViewport();

    // Texture loader with fallback support
    function loadTexture(unit, uniformName, src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.uniform1i(gl.getUniformLocation(program, uniformName), unit);
                resolve();
            };
            img.onerror = () => {
                showErr('Texture failed to load: ' + uniformName + ' (' + src + ')');
                resolve();
            };
            img.src = src;
        });
    }

    // Load textures and start render loop
    Promise.all([
        loadTexture(0, 'D', 'earth-day.jpg'),
        loadTexture(1, 'N', 'earth-night.jpg')
    ]).then(() => {
        const t0 = performance.now();
        const timeOffsetMatch = location.search.match(/[?&]t=([\d.]+)/);
        const T0 = parseFloat((timeOffsetMatch || [0, 0])[1]);

        function renderFrame() {
            gl.uniform2f(uR, canvas.width, canvas.height);
            gl.uniform1f(uT, (performance.now() - t0) / 1000 + T0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            requestAnimationFrame(renderFrame);
        }

        requestAnimationFrame(renderFrame);
    });
})();
