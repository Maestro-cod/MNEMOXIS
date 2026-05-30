import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

export class SpatialEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.nodes = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 50, 150);
        
        // Starfield
        const starGeom = new THREE.BufferGeometry();
        const coords = [];
        for(let i=0; i<10000; i++) {
            coords.push((Math.random()-0.5)*2000, (Math.random()-0.5)*2000, (Math.random()-0.5)*2000);
        }
        starGeom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
        const starMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.7, transparent: true, opacity: 0.8 });
        this.scene.add(new THREE.Points(starGeom, starMat));

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);
        
        const mainLight = new THREE.PointLight(0x00d2ff, 2, 500);
        mainLight.position.set(50, 50, 50);
        this.scene.add(mainLight);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.2;
        this.zenFactor = 1.0;

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    setZen(active) {
        this.zenFactor = active ? 0.3 : 1.0;
        this.controls.autoRotateSpeed = active ? 0.05 : 0.2;
    }

    createTaskNode(id, name, priority = 'Medium') {
        const colors = {
            'High': 0xff3366,
            'Medium': 0x00d2ff,
            'Low': 0x33ff99
        };
        const color = colors[priority] || colors['Medium'];
        
        // --- THE "BEST" UPGRADE: Semantic Scaling ---
        // Tasks with more words or "big" keywords get bigger spheres
        const words = name.toLowerCase();
        let scale = 1.0;
        if(words.includes('launch') || words.includes('project') || words.includes('urgent')) scale = 2.5;
        if(words.length < 10) scale = 0.8;

        const group = new THREE.Group();
        
        // Core Sphere with "Internal Glow"
        const geom = new THREE.SphereGeometry(2.5 * scale, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color, 
            emissiveIntensity: 1.2,
            roughness: 0.1,
            metalness: 0.8
        });
        const sphere = new THREE.Mesh(geom, mat);
        group.add(sphere);

        // Advanced Orbital Ring (Twisted)
        const ringGeom = new THREE.TorusGeometry(4.5 * scale, 0.05, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);

        // Point Light inside the star to light up nearby stars (Interactivity)
        const light = new THREE.PointLight(color, 1, 20);
        group.add(light);

        // --- THE "BEST" UPGRADE: Semantic Clustering ---
        // Instead of random, we position based on "Type"
        let xOff = (Math.random() - 0.5) * 100;
        if(priority === 'High') xOff = (Math.random() * 20) - 10; // High priority stays central

        group.position.set(
            xOff,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 100
        );

        group.userData = { id, name, priority, color };
        this.scene.add(group);
        this.nodes.push(group);
        return group;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001 * this.zenFactor;
        this.nodes.forEach((node, i) => {
            node.position.y += Math.sin(time + i) * 0.02 * this.zenFactor;
            node.rotation.y += 0.005 * this.zenFactor;
            // Pulse the ring
            node.children[1].scale.setScalar(1 + Math.sin(time * 2) * 0.1);
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
