import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

// Glowing expanding rings effect for jumps/collects
const ExpandingPulse = ({ position, color = "#ff007f" }) => {
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.scale.addScalar(delta * 4.0);
      if (ringRef.current.material) {
        ringRef.current.material.opacity = THREE.MathUtils.lerp(
          ringRef.current.material.opacity,
          0,
          0.08
        );
      }
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.1, 0.8, 32]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.8} 
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Kinematically animated bobbing platform
const FloatingPlatform = ({ plat }) => {
  const rb = useRef();
  const initialY = plat.pos[1];

  useFrame((state) => {
    if (rb.current) {
      const t = state.clock.getElapsedTime();
      // Smooth sinusoidal bobbing based on its X position
      const bobY = initialY + Math.sin(t * 2.0 + plat.pos[0] * 0.4) * 0.45;
      rb.current.setNextKinematicTranslation({
        x: plat.pos[0],
        y: bobY,
        z: plat.pos[2]
      });
    }
  });

  const halfExtents = [plat.size[0] / 2, plat.size[1] / 2, plat.size[2] / 2];

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders={false}>
      <mesh receiveShadow>
        <boxGeometry args={plat.size} />
        <meshStandardMaterial 
          color={plat.color} 
          roughness={0.2}
          metalness={0.9}
          emissive="#00f0ff"
          emissiveIntensity={1.5}
        />
      </mesh>
      <CuboidCollider args={halfExtents} />
      {/* Under-light neon glow */}
      <pointLight position={[0, -0.4, 0]} intensity={3.0} color="#00f0ff" distance={8} decay={1.5} />
    </RigidBody>
  );
};

// Coin Component with custom rotation & neon local pointLight
const Coin = ({ position, onCollect }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 3;
    }
  });

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={0.9} 
          roughness={0.1} 
          emissive="#FFA500" 
          emissiveIntensity={1.0} 
        />
      </mesh>
      <CuboidCollider args={[0.35, 0.35, 0.35]} sensor onIntersectionEnter={onCollect} />
      {/* Local Neon Glow */}
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#FFD700" distance={4} decay={1.5} />
    </RigidBody>
  );
};

// Spike Component with neon local pointLight
const Spike = ({ position, onHit }) => {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <mesh castShadow>
        <coneGeometry args={[0.35, 0.8, 16]} />
        <meshStandardMaterial 
          color="#FF3366" 
          toneMapped={false} 
          emissive="#FF0000" 
          emissiveIntensity={1.2} 
        />
      </mesh>
      <CuboidCollider args={[0.35, 0.4, 0.35]} sensor onIntersectionEnter={onHit} />
      {/* Local Hazard Glow */}
      <pointLight position={[0, 0.2, 0]} intensity={2.0} color="#FF0000" distance={5} decay={1.5} />
    </RigidBody>
  );
};

// Cyber Cargo Crate Component (Dynamic Physics Object)
const Crate = ({ position }) => {
  return (
    <RigidBody type="dynamic" colliders={false} position={position} mass={0.5}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.4} 
          metalness={0.8} 
          emissive="#f97316" 
          emissiveIntensity={0.4} 
        />
      </mesh>
      {/* Frame details to make crate look futuristic */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial color="#0f172a" wireframe />
      </mesh>
      <CuboidCollider args={[0.35, 0.35, 0.35]} />
    </RigidBody>
  );
};

// Trampoline Jump Pad Component (Vertical Launcher)
const Trampoline = ({ position, onLaunch }) => {
  const handleJump = (event) => {
    if (event.other && event.other.rigidBody) {
      // Clear vertical velocity to guarantee consistent launching power
      const currentVel = event.other.rigidBody.linvel();
      event.other.rigidBody.setLinvel({ x: currentVel.x, y: 0, z: currentVel.z }, true);
      // Apply upward vertical impulse
      event.other.rigidBody.applyImpulse({ x: 0, y: 15.0, z: 0 }, true);
      if (onLaunch) onLaunch();
    }
  };

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Cyberpunk Pink Base Plate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.12, 1.2]} />
        <meshStandardMaterial 
          color="#ec4899" 
          toneMapped={false} 
          emissive="#db2777" 
          emissiveIntensity={2.0} 
        />
      </mesh>
      {/* Interactive Core */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.04, 16]} />
        <meshStandardMaterial 
          color="#f472b6" 
          toneMapped={false} 
          emissive="#ec4899" 
          emissiveIntensity={4.0} 
        />
      </mesh>
      <CuboidCollider args={[0.6, 0.15, 0.6]} sensor onIntersectionEnter={handleJump} />
    </RigidBody>
  );
};

export const EndlessWorld = () => {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const addPoints = useGameStore((state) => state.addPoints);
  const loseLife = useGameStore((state) => state.loseLife);
  const gameState = useGameStore((state) => state.gameState);

  const [worldData, setWorldData] = useState({
    platforms: [
      { id: 'start-floor', pos: [0, -1, 0], size: [25, 0.5, 5], color: '#1e293b' }
    ],
    coins: [
      { id: 'start-coin-1', pos: [4, 1, 0], collected: false },
      { id: 'start-coin-2', pos: [8, 1.5, 0], collected: false }
    ],
    spikes: [],
    crates: [],
    trampolines: []
  });

  const [visualEffects, setVisualEffects] = useState([]);

  const lastSpawnedX = useRef(12.5); // End of the initial starting platform

  const spawnEffect = (pos, color) => {
    const id = Math.random().toString();
    setVisualEffects((prev) => [...prev, { id, pos, color, time: Date.now() }]);
  };

  // Reset world when game restarts
  useEffect(() => {
    if (gameState === 'PLAYING') {
      setWorldData({
        platforms: [
          { id: 'start-floor', pos: [0, -1, 0], size: [25, 0.5, 5], color: '#1e293b' }
        ],
        coins: [
          { id: 'start-coin-1', pos: [4, 1, 0], collected: false },
          { id: 'start-coin-2', pos: [8, 1.5, 0], collected: false }
        ],
        spikes: [],
        crates: [],
        trampolines: []
      });
      setVisualEffects([]);
      lastSpawnedX.current = 12.5;
    }
  }, [gameState]);

  useFrame(() => {
    if (gameState !== 'PLAYING') return;

    const px = playerPosition.x;
    
    // Prune expired FX rings
    setVisualEffects((prev) => prev.filter((eff) => Date.now() - eff.time < 1000));

    // Spawn ahead: if player is within 30 units of the last spawned position, generate a new chunk
    if (px + 30 > lastSpawnedX.current) {
      const chunkWidth = 15;
      const startX = lastSpawnedX.current;
      const chunkType = Math.floor(Math.random() * 4); // 0: Flat, 1: Gap, 2: Elevated, 3: Spikes

      const newPlatforms = [];
      const newCoins = [];
      const newSpikes = [];
      const newCrates = [];
      const newTrampolines = [];
      const chunkId = `chunk-${startX}`;

      switch (chunkType) {
        case 0: // Flat land with multiple crates
          newPlatforms.push({
            id: `${chunkId}-flat`,
            pos: [startX + chunkWidth / 2, -1, 0],
            size: [chunkWidth, 0.5, 5],
            color: '#1e293b'
          });
          newCoins.push(
            { id: `${chunkId}-c1`, pos: [startX + 5, 0.8, -1], collected: false },
            { id: `${chunkId}-c2`, pos: [startX + 10, 0.8, 1], collected: false }
          );
          newCrates.push(
            { id: `${chunkId}-crate-1`, pos: [startX + 6.5, 0.5, -1.2] },
            { id: `${chunkId}-crate-2`, pos: [startX + 8.5, 0.5, 1.2] }
          );
          break;

        case 1: // Jump Gap with Launcher Pad
          newPlatforms.push(
            {
              id: `${chunkId}-gap-left`,
              pos: [startX + 3, -1, 0],
              size: [6, 0.5, 5],
              color: '#1e293b'
            },
            {
              id: `${chunkId}-gap-right`,
              pos: [startX + 12, -1, 0],
              size: [6, 0.5, 5],
              color: '#1e293b'
            }
          );
          // Coin floating in the gap
          newCoins.push({
            id: `${chunkId}-gap-c`,
            pos: [startX + 7.5, 1.8, 0],
            collected: false
          });
          // Trampoline pad right before the gap so players can launch over or jump really high!
          newTrampolines.push({
            id: `${chunkId}-trampoline`,
            pos: [startX + 2, -0.65, 0]
          });
          break;

        case 2: // Elevated Platforms with crate on top
          newPlatforms.push(
            {
              id: `${chunkId}-elev-floor`,
              pos: [startX + chunkWidth / 2, -1, 0],
              size: [chunkWidth, 0.5, 5],
              color: '#0f172a'
            },
            {
              id: `${chunkId}-elev-mid`,
              pos: [startX + 7.5, 1.2, 0],
              size: [5, 0.4, 3],
              color: '#3b82f6' // Glowing neon blue floating platform
            }
          );
          newCoins.push(
            { id: `${chunkId}-elev-c1`, pos: [startX + 6.5, 2.2, 0], collected: false },
            { id: `${chunkId}-elev-c2`, pos: [startX + 7.5, 2.4, 0], collected: false },
            { id: `${chunkId}-elev-c3`, pos: [startX + 8.5, 2.2, 0], collected: false }
          );
          newCrates.push({
            id: `${chunkId}-crate-elev`,
            pos: [startX + 7.5, 2.0, 0]
          });
          break;

        case 3: // Spikes Hazard & crates
          newPlatforms.push({
            id: `${chunkId}-spike-floor`,
            pos: [startX + chunkWidth / 2, -1, 0],
            size: [chunkWidth, 0.5, 5],
            color: '#1e293b'
          });
          newSpikes.push(
            { id: `${chunkId}-spike-1`, pos: [startX + 6, -0.4, -1.2] },
            { id: `${chunkId}-spike-2`, pos: [startX + 9, -0.4, 1.2] }
          );
          newCoins.push(
            { id: `${chunkId}-sc1`, pos: [startX + 4, 1.0, 0], collected: false },
            { id: `${chunkId}-sc2`, pos: [startX + 11, 1.0, 0], collected: false }
          );
          newCrates.push({
            id: `${chunkId}-crate-spike`,
            pos: [startX + 7.5, 0.5, 0]
          });
          break;
      }

      // Update state, appending new items and pruning elements far behind the player (X < px - 35)
      setWorldData((prev) => ({
        platforms: [...prev.platforms, ...newPlatforms].filter((p) => p.pos[0] > px - 35),
        coins: [...prev.coins, ...newCoins].filter((c) => c.pos[0] > px - 35),
        spikes: [...prev.spikes, ...newSpikes].filter((s) => s.pos[0] > px - 35),
        crates: [...(prev.crates || []), ...newCrates].filter((cr) => cr.pos[0] > px - 35),
        trampolines: [...(prev.trampolines || []), ...newTrampolines].filter((t) => t.pos[0] > px - 35)
      }));

      lastSpawnedX.current += chunkWidth;
    }
  });

  const handleCoinCollect = (coinId, coinPos) => {
    setWorldData((prev) => ({
      ...prev,
      coins: prev.coins.filter((c) => c.id !== coinId)
    }));
    addPoints(10);
    spawnEffect([coinPos[0], coinPos[1], coinPos[2] || 0], "#FFD700");
  };

  return (
    <>
      {/* Platforms */}
      {worldData.platforms.map((plat) => {
        // If it's the neon blue floating platform, render the dynamic Kinematic Bobbing platform!
        if (plat.color === '#3b82f6') {
          return <FloatingPlatform key={plat.id} plat={plat} />;
        }

        const halfExtents = [plat.size[0] / 2, plat.size[1] / 2, plat.size[2] / 2];
        return (
          <RigidBody key={plat.id} type="fixed" position={plat.pos} colliders={false}>
            <mesh receiveShadow>
              <boxGeometry args={plat.size} />
              <meshStandardMaterial 
                color={plat.color} 
                roughness={0.4}
                metalness={0.2}
                emissive={plat.color === '#3b82f6' ? '#1d4ed8' : '#000000'}
                emissiveIntensity={0.3}
              />
            </mesh>
            <CuboidCollider args={halfExtents} />
          </RigidBody>
        );
      })}

      {/* Coins */}
      {worldData.coins.map((coin) => (
        <Coin 
          key={coin.id} 
          position={coin.pos} 
          onCollect={() => handleCoinCollect(coin.id, coin.pos)} 
        />
      ))}

      {/* Spikes */}
      {worldData.spikes.map((spike) => (
        <Spike 
          key={spike.id} 
          position={spike.pos} 
          onHit={() => loseLife()} 
        />
      ))}

      {/* Crates */}
      {(worldData.crates || []).map((crate) => (
        <Crate 
          key={crate.id} 
          position={crate.pos} 
        />
      ))}

      {/* Trampolines with FX pulse spawn hook */}
      {(worldData.trampolines || []).map((tramp) => (
        <Trampoline 
          key={tramp.id} 
          position={tramp.pos} 
          onLaunch={() => spawnEffect(tramp.pos, "#ec4899")}
        />
      ))}

      {/* Glowing Rings FX Systems */}
      {visualEffects.map((eff) => (
        <ExpandingPulse 
          key={eff.id} 
          position={eff.pos} 
          color={eff.color} 
        />
      ))}
    </>
  );
};
