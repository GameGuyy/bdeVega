import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const ParticleSystem = () => {
  const mesh = useRef();
  const particleTrigger = useGameStore((state) => state.particleTrigger);

  // Store active particles in a mutable ref array to avoid React re-render lags
  const particlesRef = useRef([]);
  const maxParticles = 400;

  // Track the last trigger ID to prevent double-spawning
  const lastTriggerId = useRef(null);

  // Spawn function
  const spawnBurst = (pos, type) => {
    const list = particlesRef.current;
    let count = 0;
    let colorHex = "#ffffff";
    let speedMult = 1.0;
    let gravityVal = 8.0;
    let decayVal = 1.8;
    let sizeRange = [0.08, 0.15];

    if (type === 'coin') {
      count = 25;
      colorHex = "#ffd700";
      speedMult = 4.5;
      gravityVal = 4.0;
      decayVal = 1.2;
      sizeRange = [0.06, 0.12];
    } else if (type === 'trampoline') {
      count = 35;
      colorHex = "#ec4899";
      speedMult = 6.0;
      gravityVal = 12.0;
      decayVal = 1.5;
      sizeRange = [0.07, 0.14];
    } else if (type === 'jump') {
      count = 15;
      colorHex = "#cbd5e1";
      speedMult = 2.5;
      gravityVal = 5.0;
      decayVal = 2.2;
      sizeRange = [0.05, 0.1];
    } else if (type === 'run') {
      count = 1;
      colorHex = "#94a3b8";
      speedMult = 1.2;
      gravityVal = -1.0; // Float upwards slightly
      decayVal = 3.0; // Decay very quickly
      sizeRange = [0.04, 0.08];
    } else if (type === 'spike') {
      count = 30;
      colorHex = "#ff3366";
      speedMult = 5.5;
      gravityVal = 10.0;
      decayVal = 1.6;
      sizeRange = [0.08, 0.16];
    }

    const startX = pos.x;
    const startY = pos.y;
    const startZ = pos.z;

    const threeColor = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      if (list.length >= maxParticles) {
        list.shift(); // Remove oldest particle to cap count
      }

      let vx = (Math.random() - 0.5) * speedMult;
      let vy = (Math.random() - 0.5) * speedMult;
      let vz = (Math.random() - 0.5) * speedMult;

      if (type === 'trampoline') {
        // Shoot predominantly upwards
        vy = Math.random() * speedMult + 3.0;
        vx = (Math.random() - 0.5) * speedMult * 0.5;
        vz = (Math.random() - 0.5) * speedMult * 0.5;
      } else if (type === 'jump') {
        // Shoot downwards and outwards
        vy = -Math.random() * speedMult - 0.5;
      }

      list.push({
        x: startX,
        y: startY,
        z: startZ,
        vx,
        vy,
        vz,
        color: threeColor.clone(),
        size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0],
        life: 1.0,
        decay: Math.random() * 0.5 + decayVal,
        gravity: gravityVal,
      });
    }
  };

  // Watch trigger
  useEffect(() => {
    if (particleTrigger && particleTrigger.id !== lastTriggerId.current) {
      lastTriggerId.current = particleTrigger.id;
      spawnBurst(particleTrigger.pos, particleTrigger.type);
    }
  }, [particleTrigger]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!mesh.current) return;

    const dt = Math.min(delta, 0.05);
    const list = particlesRef.current;

    // Update active particles
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }

      // Physics integration
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }

    // Update instances
    const activeCount = list.length;
    mesh.current.count = activeCount;

    for (let i = 0; i < activeCount; i++) {
      const p = list[i];
      dummy.position.set(p.x, p.y, p.z);
      
      // Scale shrinks as particle dies
      const currentScale = p.size * p.life;
      dummy.scale.setScalar(currentScale);
      
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, p.color);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) {
      mesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, maxParticles]} castShadow={false} receiveShadow={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial toneMapped={false} transparent={true} />
    </instancedMesh>
  );
};
