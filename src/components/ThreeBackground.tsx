import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  paused?: boolean;
  intensity?: 'hero' | 'subtle';
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({
  paused = false,
  intensity = 'hero',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 0, 12);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const emeraldLight = new THREE.PointLight(0x10b981, 32, 35);
    emeraldLight.position.set(5, 4, 6);
    scene.add(emeraldLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 24, 30);
    cyanLight.position.set(-5, -3, 5);
    scene.add(cyanLight);

    const indigoLight = new THREE.PointLight(0x6366f1, 18, 28);
    indigoLight.position.set(0, 5, -4);
    scene.add(indigoLight);

    // Floating 3D QR-inspired lattice cubes
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const cubeGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const emeraldMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.65,
    });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.7,
    });
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8,
    });

    const nodes: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number }[] = [];
    const count = intensity === 'hero' ? 42 : 22;

    for (let i = 0; i < count; i++) {
      const mat = i % 5 === 0 ? emeraldMat : i % 7 === 0 ? cyanMat : slateMat;
      const mesh = new THREE.Mesh(cubeGeo, mat);
      const x = ((i * 37) % 18) - 9;
      const y = ((i * 53) % 10) - 5;
      const z = ((i * 19) % 8) - 6;
      mesh.position.set(x, y, z);
      const scale = 0.55 + ((i * 13) % 10) * 0.08;
      mesh.scale.setScalar(scale);
      cubeGroup.add(mesh);
      nodes.push({
        mesh,
        baseY: y,
        speed: 0.4 + (i % 5) * 0.12,
        phase: i * 0.7,
      });
    }

    // Starfield / data particles
    const particleCount = intensity === 'hero' ? 260 : 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.06,
      transparent: true,
      opacity: intensity === 'hero' ? 0.55 : 0.3,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Subtle orbital wireframe ring
    const ringGeo = new THREE.TorusGeometry(4.2, 0.015, 10, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: intensity === 'hero' ? 0.25 : 0.12,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    let pointerX = 0;
    let pointerY = 0;
    const handlePointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const clock = new THREE.Clock();

    const renderScene = (elapsed: number) => {
      cubeGroup.rotation.y = elapsed * 0.06 + pointerX * 0.18;
      cubeGroup.rotation.x = Math.sin(elapsed * 0.15) * 0.08 - pointerY * 0.12;
      particles.rotation.y = -elapsed * 0.025;
      ring.rotation.z = elapsed * 0.09;

      for (const node of nodes) {
        node.mesh.position.y = node.baseY + Math.sin(elapsed * node.speed + node.phase) * 0.28;
        node.mesh.rotation.x = elapsed * 0.25 + node.phase;
        node.mesh.rotation.y = elapsed * 0.3 + node.phase;
      }

      renderer.render(scene, camera);
    };

    renderScene(0.5);

    const animate = () => {
      if (!pausedRef.current) {
        renderScene(clock.getElapsedTime());
      }
      rafId = window.requestAnimationFrame(animate);
    };
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      cubeGeo.dispose();
      emeraldMat.dispose();
      cyanMat.dispose();
      slateMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [intensity]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    />
  );
};

