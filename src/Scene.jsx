import { PerspectiveCamera, OrthographicCamera, Environment } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useGameStore } from './store/useGameStore';
import { Suspense, useRef, useMemo } from 'react';
import { EndlessWorld } from './components/EndlessWorld';
import { CameraController } from './components/CameraController';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ----------------------------------------------------
// Glowing Neon Dust Particle System (HDR Atmosphere)
// ----------------------------------------------------
const GlowingDust = ({ count = 70 }) => {
  const mesh = useRef();
  const playerPosition = useGameStore((state) => state.playerPosition);

  // Generate random initial positions & speeds for dust particles
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        offsetX: Math.random() * 40 - 20, // Spread around player X
        offsetY: Math.random() * 8 - 1,   // Y height spread
        offsetZ: Math.random() * 8 - 4,   // Z depth spread
        speedX: Math.random() * 0.4 + 0.1,
        speedY: Math.random() * 0.3 + 0.1,
        scale: Math.random() * 0.07 + 0.03,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    const px = playerPosition.x;

    particles.forEach((p, i) => {
      // Drift the particles slowly
      let x = px + p.offsetX - (t * p.speedX * 3) % 40;
      // Wrap X position so they stay in a loop around the player
      if (x < px - 20) x += 40;
      if (x > px + 20) x -= 40;

      const y = p.offsetY + Math.sin(t * p.speedY + p.phase) * 0.8;
      const z = p.offsetZ + Math.cos(t * 0.2 + p.phase) * 0.4;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial 
        color="#00f0ff" 
        toneMapped={false} 
        transparent 
        opacity={0.5}
      />
    </instancedMesh>
  );
};

// ----------------------------------------------------
// Cyberpunk Sweeping Searchlight Component
// ----------------------------------------------------
const Searchlight = ({ position, rotationSpeed = 0.5, color = "#ff007f", angleOffset = 0 }) => {
  const lightRef = useRef();
  const coneRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * rotationSpeed + angleOffset;
    // Sweep back and forth
    const angleX = Math.sin(t) * 0.4;
    const angleZ = Math.cos(t * 0.6) * 0.3;

    if (lightRef.current) {
      lightRef.current.target.position.set(
        position[0] + Math.sin(angleX) * 15,
        0,
        position[2] + Math.sin(angleZ) * 15
      );
      lightRef.current.target.updateMatrixWorld();
    }

    if (coneRef.current) {
      coneRef.current.rotation.z = angleX;
      coneRef.current.rotation.x = angleZ;
    }
  });

  return (
    <group position={position}>
      {/* Light Mesh projector base */}
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.35, 0.5, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glowing physical projector lens */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={color} toneMapped={false} emissive={color} emissiveIntensity={2.0} />
      </mesh>

      {/* Actual Spotlight Source */}
      <spotLight 
        ref={lightRef}
        position={[0, 0.25, 0]}
        angle={0.3}
        penumbra={0.9}
        intensity={25}
        color={color}
        distance={30}
      />
      
      {/* Visual glowing light shaft cone */}
      <group ref={coneRef}>
        <mesh position={[0, 5, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[1.5, 10, 16, 1, true]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.08} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

export const Scene = ({ children }) => {
  const dimension = useGameStore((state) => state.dimension);
  const playerPosition = useGameStore((state) => state.playerPosition);

  // Position the shadow-casting directional light relative to the player
  // to ensure shadow maps remain high-resolution and never clip out along the infinite track.
  const lightPosition = [playerPosition.x - 10, 18, 8];

  // We align searchlights in the background relative to the player so they sweep along dynamically as you run!
  const searchlightPinkPos = [playerPosition.x + 12, -0.9, -4.5];
  const searchlightCyanPos = [playerPosition.x - 6, -0.9, 4.5];

  return (
    <>
      {dimension === '3D' ? (
        <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={50} />
      ) : (
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
      )}

      {/* Dynamic Camera tracking */}
      <CameraController />

      {/* Low ambient light for an immersive, high-contrast cyberpunk atmosphere */}
      <ambientLight intensity={0.12} color="#0c0c1e" />
      
      {/* Dynamic Moonlight that follows the player for endless real-time shadows */}
      <directionalLight 
        position={lightPosition} 
        intensity={1.0} 
        color="#8ba3cf" 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0008}
      />

      {/* Ambient environment styling in 3D mode */}
      {dimension === '3D' && (
        <>
          {/* Sweeping Neon Cyberpunk Searchlights */}
          <Searchlight position={searchlightPinkPos} color="#ff007f" rotationSpeed={0.4} angleOffset={0} />
          <Searchlight position={searchlightCyanPos} color="#00f0ff" rotationSpeed={0.5} angleOffset={Math.PI / 2} />
          
          {/* Floating Neon AgX Embers/Atmospheric Dust particles */}
          <GlowingDust count={120} />
        </>
      )}
      
      <Environment preset="city" />

      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]}>
          {children}
          
          {/* Procedural Endless levels spawner */}
          <EndlessWorld />
        </Physics>
      </Suspense>
    </>
  );
};
