import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ===========================
   GLOBALS & STATE
   =========================== */
let scene, camera, renderer, controls;
let starfield, galaxyGroup, accretionDisk, heartMesh;
let textRingGroup, photoBubbles = [];
let isWarping = false;
let isGalaxyVisible = false;

// Raycaster globals
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// DOM Elements
const introOverlay = document.getElementById('intro-overlay');
const btnIniciar = document.getElementById('btn-iniciar');

// Modal Elements
const modal = document.getElementById('image-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const btnCloseModal = document.getElementById('close-modal');
const modalImage = document.getElementById('modal-image');

/* ===========================
   INITIALIZATION
   =========================== */
function init() {
    // 1. Scene Setup
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0005);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 0, 1500);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050510, 1);
    
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Add Ambient Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // 4. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = false;
    controls.target.set(0, 0, 0);

    // 5. Create Elements
    createStarfield();
    
    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);
    
    createPlanetaryGalaxyPlane();
    createWireframeHeart();
    createTextRing();
    createPhotoBubbles();
    
    // Hide galaxy elements initially
    galaxyGroup.visible = false;

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize);
    btnIniciar.addEventListener('click', startWarpSequence);
    
    // Raycaster events
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onClick);

    // Modal close events
    btnCloseModal.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    // 7. Start Animation Loop
    renderer.setAnimationLoop(animate);
}

/* ===========================
   PHASE 1: STARFIELD
   =========================== */
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const posArray = new Float32Array(starCount * 3);
    const colorArray = new Float32Array(starCount * 3);

    const colors = [
        new THREE.Color(0x00ffff),
        new THREE.Color(0xffff00),
        new THREE.Color(0xff00ff),
        new THREE.Color(0x00ff00)
    ];

    for (let i = 0; i < starCount * 3; i += 3) {
        const radius = 100 + Math.random() * 2000;
        const theta = 2 * Math.PI * Math.random();
        const z = (Math.random() - 0.5) * 6000;

        posArray[i] = radius * Math.cos(theta);
        posArray[i+1] = radius * Math.sin(theta);
        posArray[i+2] = z;

        const mixedColor = colors[Math.floor(Math.random() * colors.length)];
        colorArray[i] = mixedColor.r;
        colorArray[i+1] = mixedColor.g;
        colorArray[i+2] = mixedColor.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 2.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
}

/* ===========================
   PHASE 2: WARP SEQUENCE
   =========================== */
function startWarpSequence() {
    // UI Fades out
    gsap.to(introOverlay, {
        opacity: 0,
        duration: 0.8,
        onComplete: () => {
            introOverlay.style.display = 'none';
        }
    });

    isWarping = true;
    galaxyGroup.visible = true;

    const tl = gsap.timeline({
        onComplete: () => {
            isWarping = false;
            isGalaxyVisible = true;
            controls.enabled = true; // User can now interact
            
            // Pop heart and bubbles in smoothly
            gsap.fromTo(heartMesh.scale, 
                { x: 0.01, y: 0.01, z: 0.01 }, 
                { x: 3, y: 3, z: 3, duration: 2, ease: "elastic.out(1, 0.5)" }
            );
            
            gsap.fromTo(textRingGroup.scale,
                { x: 0.01, y: 0.01, z: 0.01 },
                { x: 1, y: 1, z: 1, duration: 1.5, ease: "power2.out", delay: 0.5 }
            );
            
            photoBubbles.forEach((bubble, i) => {
                gsap.fromTo(bubble.scale,
                    { x: 0, y: 0 },
                    { x: 18, y: 18, duration: 1.2, ease: "back.out(1.5)", delay: 1 + (i * 0.2) }
                );
            });
        }
    });

    // Camera bursts forward into high-speed star tunnel
    tl.to(camera.position, {
        z: 0,
        duration: 2.5,
        ease: "power2.in", 
    }, "start");

    tl.to(starfield.scale, {
        z: 80,
        duration: 2.5,
        ease: "power2.in"
    }, "start");

    // Slow down into a sweeping curve revealing the angled top-down view
    tl.to(camera.position, {
        y: 150,
        z: 220,
        duration: 2,
        ease: "power3.out"
    }, "start+=2.5");
    
    tl.to(controls.target, {
        y: 0,
        duration: 2,
        ease: "power3.out"
    }, "start+=2.5");

    // Fade out warp stars smoothly
    tl.to(starfield.material, {
        opacity: 0,
        duration: 1.5
    }, "start+=2.5");
}

/* ===========================
   PHASE 3: PLANETARY GALAXY
   =========================== */

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function createPlanetaryGalaxyPlane() {
    // Dense, flat disc of glowing particles
    const count = 75000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const innerRadius = 20; // Clear center
    const outerRadius = 300;
    
    const colorCore = new THREE.Color(0xff4488); // Pinkish core
    const colorMid = new THREE.Color(0x8822ff); // Purple mid
    const colorOuter = new THREE.Color(0x110044); // Dark blue outer

    for(let i=0; i<count; i++) {
        const i3 = i * 3;
        
        // Logarithmic/Exponential distribution for dense core
        const r = innerRadius + Math.pow(Math.random(), 3) * (outerRadius - innerRadius);
        const theta = Math.random() * Math.PI * 2;
        
        // Extremely flat Y axis (planetary ring)
        const y = (Math.random() - 0.5) * 3;

        positions[i3] = r * Math.cos(theta);
        positions[i3+1] = y;
        positions[i3+2] = r * Math.sin(theta);

        // Color gradient based on radius
        let col = colorCore.clone();
        if (r < 100) {
            col.lerp(colorMid, (r - innerRadius) / (100 - innerRadius));
        } else {
            col = colorMid.clone().lerp(colorOuter, (r - 100) / (outerRadius - 100));
        }
        
        // Sprinkle bright stardust
        if (Math.random() > 0.98) {
            col.setHex(0xffffff);
        }

        colors[i3] = col.r;
        colors[i3+1] = col.g;
        colors[i3+2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.2,
        map: createParticleTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
    });

    const galaxyPlane = new THREE.Points(geometry, material);
    galaxyGroup.add(galaxyPlane);
}

function createWireframeHeart() {
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();

    // Mathematically draw a heart shape
    heartShape.moveTo( x + 5, y + 5 );
    heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
    heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
    heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
    heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
    heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
    heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );

    const extrudeSettings = { 
        depth: 2, 
        bevelEnabled: true, 
        bevelSegments: 5, 
        steps: 2, 
        bevelSize: 1.5, 
        bevelThickness: 1.5 
    };
    
    const geometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );
    
    // Center geometry exactly
    geometry.center();
    
    // Rotate 180 deg on Z to make heart point down
    geometry.rotateZ(Math.PI);

    // Create wireframe edges for the glowing outline look
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
        color: 0xff1493, // Deep pink/magenta
        transparent: true,
        opacity: 0.9,
        linewidth: 2
    });

    heartMesh = new THREE.LineSegments(edges, material);
    
    // Position directly at absolute center (0, y, 0), hovering clearly above plane
    heartMesh.position.set(0, 55, 0);
    // Start scaled down (will pop in)
    heartMesh.scale.set(0.01, 0.01, 0.01);

    galaxyGroup.add( heartMesh );
}

/* ===========================
   TEXT RING
   =========================== */
function createTextRing() {
    textRingGroup = new THREE.Group();
    
    const texts = [
        "MI CORAZÓN ES TUYO",
        "CONTIGO SIEMPRE",
        "INFINITO ∞",
        "AMOR ETERNO"
    ];
    
    const radius = 55; // Tight circular orbit around the heart

    texts.forEach((text, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        ctx.font = 'Bold 40px Montserrat, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Pinkish text glow
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 10;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; 
        
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.scale.set(40, 10, 1);
        
        const angle = (index / texts.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        sprite.position.set(x, 45, z); // Orbit around the lower-middle of the heart
        
        textRingGroup.add(sprite);
    });
    
    galaxyGroup.add(textRingGroup);
}

/* ===========================
   PHOTO/MEME BUBBLES
   =========================== */
function createPhotoBubbles() {
    // Array of image URLs (placeholders for Flork memes / photos)
    const images = [
        'photo1.jpg', // Placeholder 1
        'photo2.jpg', // Placeholder 2
        'photo3.jpg', // Placeholder 3
        'photo4.jpg'  // Placeholder 4
    ];

    const radius = 120; // Wider radius outside the text ring

    images.forEach((url, index) => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw solid white circle (Sticker/Badge base)
        ctx.beginPath();
        ctx.arc(size/2, size/2, (size/2) - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ff69b4'; // Pink border for romance
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        if (url && url !== '') {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(size/2, size/2, (size/2) - 10, 0, Math.PI * 2);
                ctx.clip();
                
                const scale = Math.max(size / img.width, size / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (size / 2) - (w / 2);
                const y = (size / 2) - (h / 2);
                
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
                
                texture.needsUpdate = true;
            };
            img.src = url;
            // Store URL for raycaster modal
            sprite.userData.url = url; 
        } else {
            // Draw placeholder icon
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PHOTO', size/2, size/2);
            sprite.userData.url = null;
        }
        
        // Start scale at 0 for GSAP pop-in
        sprite.scale.set(0, 0, 1);
        
        const angle = (index / images.length) * Math.PI * 2;
        
        sprite.userData.angle = angle;
        sprite.userData.radius = radius;
        sprite.userData.bobOffset = index; // Offset so they don't bob identically
        
        // Add specific flag to identify clickable photo bubbles
        sprite.userData.isClickable = true;

        photoBubbles.push(sprite);
        galaxyGroup.add(sprite);
    });
}

/* ===========================
   RAYCASTER & MODAL LOGIC
   =========================== */
function onPointerMove(event) {
    if (!isGalaxyVisible) return;

    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(photoBubbles);

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
}

function onClick(event) {
    if (!isGalaxyVisible) return;
    
    // Ignore clicks if modal is already open
    if (!modal.classList.contains('hidden')) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoBubbles);

    if (intersects.length > 0) {
        const clickedSprite = intersects[0].object;
        if (clickedSprite.userData.url) {
            openModal(clickedSprite.userData.url);
        }
    }
}

function openModal(imgSrc) {
    modalImage.src = imgSrc;
    modal.classList.remove('hidden');
    // Disable orbit controls while modal is open
    if (controls) controls.enabled = false;
}

function closeModal() {
    modal.classList.add('hidden');
    // Re-enable orbit controls
    if (controls && isGalaxyVisible) controls.enabled = true;
    modalImage.src = '';
}

/* ===========================
   ANIMATION LOOP
   =========================== */
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    if (isWarping && starfield) {
        starfield.position.z += 100; 
    }

    if (isGalaxyVisible) {
        // Slowly rotate entire galaxy plane
        if (galaxyGroup) {
            galaxyGroup.rotation.y = elapsedTime * 0.03;
        }

        // Rotate the text ring continuously around the heart
        if (textRingGroup) {
            // Negative rotation against the galaxy group to make it spin faster
            textRingGroup.rotation.y = elapsedTime * -0.2; 
        }

        // Float heart up and down slightly around its new elevated position
        if (heartMesh) {
            heartMesh.position.y = 55 + Math.sin(elapsedTime * 2) * 2;
            heartMesh.rotation.y = elapsedTime * 0.5; // Spin on its axis
        }

        // Orbit and bob photo bubbles around the middle section of the heart
        photoBubbles.forEach((sprite) => {
            // Sinusoidal bob up and down
            const y = 45 + Math.sin(elapsedTime * 2 + sprite.userData.bobOffset) * 10; 
            
            const x = Math.cos(sprite.userData.angle) * sprite.userData.radius;
            const z = Math.sin(sprite.userData.angle) * sprite.userData.radius;
            
            sprite.position.set(x, y, z);
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

/* ===========================
   UTILITIES
   =========================== */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
