/**
 * Three.js hero particle animation — 200+ particles under IPS forces.
 */
import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
if (canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0e17, 1);

  // Determine particle count based on device
  const isMobile = window.innerWidth < 768;
  const N = isMobile ? 100 : 250;

  // Particle geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(N * 3);
  const velocities = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);

  // Color palette: cyan to blue gradient
  const c1 = new THREE.Color(0x06b6d4); // cyan
  const c2 = new THREE.Color(0x3b82f6); // blue
  const c3 = new THREE.Color(0x8b5cf6); // purple

  for (let i = 0; i < N; i++) {
    // Initialize positions in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4 + Math.random() * 4;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

    // Color: gradient from cyan to purple
    const t = Math.random();
    const c = t < 0.5 ? c1.clone().lerp(c2, t * 2) : c2.clone().lerp(c3, (t - 0.5) * 2);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = 0.08 + Math.random() * 0.12;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Shader material for soft glow particles
  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d) * 0.7;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Connection lines for nearby particles
  const lineGeometry = new THREE.BufferGeometry();
  const maxLines = N * 3;
  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);

  // Simplified IPS-like dynamics
  const k = 0.015; // confinement
  const interaction = 0.001; // weak interaction

  function animate() {
    const pos = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < N; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

      // Confinement: pull toward origin
      velocities[ix] -= k * pos[ix];
      velocities[iy] -= k * pos[iy];
      velocities[iz] -= k * pos[iz];

      // Weak interaction with nearby particles (sample 5 random)
      for (let s = 0; s < 5; s++) {
        const j = Math.floor(Math.random() * N);
        if (j === i) continue;
        const dx = pos[ix] - pos[j * 3];
        const dy = pos[iy] - pos[j * 3 + 1];
        const dz = pos[iz] - pos[j * 3 + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
        // Gaussian repulsion
        const f = interaction * Math.exp(-r * r / 4) * 2 * r / 4;
        velocities[ix] += f * dx / r;
        velocities[iy] += f * dy / r;
        velocities[iz] += f * dz / r;
      }

      // Brownian noise
      velocities[ix] += (Math.random() - 0.5) * 0.005;
      velocities[iy] += (Math.random() - 0.5) * 0.005;
      velocities[iz] += (Math.random() - 0.5) * 0.005;

      // Damping
      velocities[ix] *= 0.98;
      velocities[iy] *= 0.98;
      velocities[iz] *= 0.98;

      // Update
      pos[ix] += velocities[ix];
      pos[iy] += velocities[iy];
      pos[iz] += velocities[iz];
    }

    geometry.attributes.position.needsUpdate = true;

    // Update connection lines
    let lineIdx = 0;
    const lp = lineGeometry.attributes.position.array as Float32Array;
    const lc = lineGeometry.attributes.color.array as Float32Array;
    const threshold = 3.0;

    for (let i = 0; i < N && lineIdx < maxLines; i++) {
      for (let j = i + 1; j < N && lineIdx < maxLines; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < threshold) {
          const alpha = 1 - dist / threshold;
          const b = lineIdx * 6;
          lp[b] = pos[i * 3]; lp[b + 1] = pos[i * 3 + 1]; lp[b + 2] = pos[i * 3 + 2];
          lp[b + 3] = pos[j * 3]; lp[b + 4] = pos[j * 3 + 1]; lp[b + 5] = pos[j * 3 + 2];
          lc[b] = 0.024 * alpha; lc[b + 1] = 0.714 * alpha; lc[b + 2] = 0.831 * alpha;
          lc[b + 3] = 0.024 * alpha; lc[b + 4] = 0.714 * alpha; lc[b + 5] = 0.831 * alpha;
          lineIdx++;
        }
      }
    }
    lineGeometry.setDrawRange(0, lineIdx * 2);
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;

    // Slow rotation
    points.rotation.y += 0.001;
    lines.rotation.y += 0.001;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
