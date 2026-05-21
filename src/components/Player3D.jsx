import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF, useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

// ----------------------------------------------------
// React Error Boundary to catch GLTF Loading Failures
// ----------------------------------------------------
class GLTFErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("GLTF Model failed to load. Using procedurally generated sci-fi robot fallback.", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ----------------------------------------------------
// Custom Sci-Fi Robot Model (Vibrant R3F Fallback)
// ----------------------------------------------------
const ProceduralRobot = ({ groupRef }) => {
  const headRef = useRef();
  
  useFrame((state) => {
    // Hovering/Bobbing motion for the floating robot
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 4) * 0.15 + 0.5;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Robot Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Metallic Shoulders/Thrusters */}
      <mesh position={[0.4, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.4, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Robot Head */}
      <group ref={headRef} position={[0, 0.85, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Glowing Visor (Emissive Neon Eye) */}
        <mesh position={[0, 0.05, 0.22]} castShadow>
          <boxGeometry args={[0.25, 0.08, 0.08]} />
          <meshStandardMaterial 
            color="#00f0ff" 
            toneMapped={false} 
            emissive="#00f0ff" 
            emissiveIntensity={2.5} 
          />
        </mesh>
      </group>

      {/* Rocket Thruster Flame (Bobbing cone) */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <coneGeometry args={[0.15, 0.3, 16]} />
        <meshStandardMaterial 
          color="#ff4500" 
          toneMapped={false} 
          emissive="#ff0000" 
          emissiveIntensity={2.0} 
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------
// Actual GLTF Mesh (Mixamo loader component)
// ----------------------------------------------------
const GLTFModel = ({ modelUrl, groupRef, currentAnimation, setCurrentAnimation }) => {
  const { nodes, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (actions && actions[currentAnimation]) {
      actions[currentAnimation].reset().fadeIn(0.3).play();
      return () => actions[currentAnimation].fadeOut(0.3);
    }
  }, [currentAnimation, actions]);

  return (
    <group ref={groupRef}>
      <primitive object={nodes.Scene || nodes.RootNode || Object.values(nodes)[0]} />
    </group>
  );
};

// ----------------------------------------------------
// Main Player3D Component
// ----------------------------------------------------
export const Player3D = ({ modelUrl = '/character.glb' }) => {
  const rb = useRef();
  const group = useRef();
  const [currentAnimation, setCurrentAnimation] = useState('Idle');
  const [, getKeys] = useKeyboardControls();

  // Zustand Store
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const loseLife = useGameStore((state) => state.loseLife);
  const respawnCount = useGameStore((state) => state.respawnCount);
  const gameState = useGameStore((state) => state.gameState);

  // Handle Respawning
  const lastRespawn = useRef(0);
  useEffect(() => {
    if (rb.current && respawnCount > lastRespawn.current) {
      rb.current.setTranslation({ x: 0, y: 3, z: 0 }, true);
      rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      lastRespawn.current = respawnCount;
    }
  }, [respawnCount]);

  useFrame((state, delta) => {
    if (!rb.current || gameState !== 'PLAYING') return;

    const { forward, backward, left, right, jump } = getKeys();
    const velocity = rb.current.linvel();
    const pos = rb.current.translation();
    const speed = 7.5; // Premium swift speed for the endless runner

    // Track position in store for camera & spawner
    setPlayerPosition({ x: pos.x, y: pos.y, z: pos.z });

    // Pit Death Detection
    if (pos.y < -6) {
      loseLife();
      return;
    }

    // Re-aligned 3D Control Schema:
    // Forward/Backward (W/S) controls X-axis movement (running along track)
    // Left/Right (A/D) controls Z-axis lane switching (clamped safely)
    const targetVelX = (forward ? speed : 0) - (backward ? speed : 0);
    const targetVelZ = (right ? speed : 0) - (left ? speed : 0);

    // Smooth velocity lerping for acceleration inertia
    const lerpFactor = 0.15;
    const nextVelX = THREE.MathUtils.lerp(velocity.x, targetVelX, lerpFactor);
    const nextVelZ = THREE.MathUtils.lerp(velocity.z, targetVelZ, lerpFactor);

    // Clamp player Z inside [-2.2, 2.2] to keep them on the track
    let nextZ = pos.z + nextVelZ * delta;
    let finalVelZ = nextVelZ;

    if (nextZ < -2.2) {
      rb.current.setTranslation({ x: pos.x, y: pos.y, z: -2.2 }, true);
      finalVelZ = 0;
    } else if (nextZ > 2.2) {
      rb.current.setTranslation({ x: pos.x, y: pos.y, z: 2.2 }, true);
      finalVelZ = 0;
    }

    rb.current.setLinvel({ x: nextVelX, y: velocity.y, z: finalVelZ }, true);

    // Dynamic mesh rotation & animations based on horizontal movement
    const horizontalSpeed = Math.sqrt(nextVelX * nextVelX + finalVelZ * finalVelZ);
    if (horizontalSpeed > 0.2) {
      const angle = Math.atan2(nextVelX, finalVelZ);
      if (group.current) {
        let diff = angle - group.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        group.current.rotation.y += diff * 0.2;
      }
      setCurrentAnimation('Run');
    } else {
      setCurrentAnimation('Idle');
    }

    // High fidelity jump impulse
    if (jump && Math.abs(velocity.y) < 0.1) {
      rb.current.applyImpulse({ x: 0, y: 7.2, z: 0 }, true);
    }
  });

  return (
    <RigidBody ref={rb} colliders={false} enabledRotations={[false, false, false]} position={[0, 2, 0]}>
      <GLTFErrorBoundary fallback={<ProceduralRobot groupRef={group} />}>
        <GLTFModel 
          modelUrl={modelUrl} 
          groupRef={group} 
          currentAnimation={currentAnimation} 
          setCurrentAnimation={setCurrentAnimation} 
        />
      </GLTFErrorBoundary>
      <CapsuleCollider args={[0.5, 0.35]} position={[0, 0.55, 0]} />
      {/* Dynamic Glowing Player Aura */}
      <pointLight 
        position={[0, 1.2, 0]} 
        intensity={5.0} 
        color="#00f0ff" 
        distance={12} 
        decay={1.5} 
      />
    </RigidBody>
  );
};

