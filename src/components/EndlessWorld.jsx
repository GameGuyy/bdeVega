import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

// Coin Component with custom rotation
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
        <cylinderGeometry args={[0.4, 0.4, 0.15, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} emissive="#FFA500" emissiveIntensity={0.5} />
      </mesh>
      <CuboidCollider args={[0.4, 0.4, 0.4]} sensor onIntersectionEnter={onCollect} />
    </RigidBody>
  );
};

// Spike Component
const Spike = ({ position, onHit }) => {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <mesh castShadow>
        <coneGeometry args={[0.4, 0.8, 4]} />
        <meshStandardMaterial color="#FF3366" toneMapped={false} emissive="#FF0000" emissiveIntensity={0.8} />
      </mesh>
      <CuboidCollider args={[0.4, 0.4, 0.4]} sensor onIntersectionEnter={onHit} />
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
    spikes: []
  });

  const lastSpawnedX = useRef(12.5); // End of the initial starting platform

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
        spikes: []
      });
      lastSpawnedX.current = 12.5;
    }
  }, [gameState]);

  useFrame(() => {
    if (gameState !== 'PLAYING') return;

    const px = playerPosition.x;
    
    // Spawn ahead: if player is within 30 units of the last spawned position, generate a new chunk
    if (px + 30 > lastSpawnedX.current) {
      const chunkWidth = 15;
      const startX = lastSpawnedX.current;
      const chunkType = Math.floor(Math.random() * 4); // 0: Flat, 1: Gap, 2: Elevated, 3: Spikes

      const newPlatforms = [];
      const newCoins = [];
      const newSpikes = [];
      const chunkId = `chunk-${startX}`;

      switch (chunkType) {
        case 0: // Flat land
          newPlatforms.push({
            id: `${chunkId}-flat`,
            pos: [startX + chunkWidth / 2, -1, 0],
            size: [chunkWidth, 0.5, 5],
            color: '#1e293b'
          });
          newCoins.push(
            { id: `${chunkId}-c1`, pos: [startX + 5, 0.8, 0], collected: false },
            { id: `${chunkId}-c2`, pos: [startX + 10, 0.8, 0], collected: false }
          );
          break;

        case 1: // Jump Gap
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
          break;

        case 2: // Elevated Platforms
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
          break;

        case 3: // Spikes Hazard
          newPlatforms.push({
            id: `${chunkId}-spike-floor`,
            pos: [startX + chunkWidth / 2, -1, 0],
            size: [chunkWidth, 0.5, 5],
            color: '#1e293b'
          });
          newSpikes.push({
            id: `${chunkId}-spike-1`,
            pos: [startX + 7.5, -0.4, 0]
          });
          newCoins.push(
            { id: `${chunkId}-sc1`, pos: [startX + 4, 1.0, 0], collected: false },
            { id: `${chunkId}-sc2`, pos: [startX + 11, 1.0, 0], collected: false }
          );
          break;
      }

      // Update state, appending new items and pruning elements far behind the player (X < px - 40)
      setWorldData((prev) => ({
        platforms: [...prev.platforms, ...newPlatforms].filter((p) => p.pos[0] > px - 35),
        coins: [...prev.coins, ...newCoins].filter((c) => c.pos[0] > px - 35),
        spikes: [...prev.spikes, ...newSpikes].filter((s) => s.pos[0] > px - 35)
      }));

      lastSpawnedX.current += chunkWidth;
    }
  });

  const handleCoinCollect = (coinId) => {
    setWorldData((prev) => ({
      ...prev,
      coins: prev.coins.map((c) => (c.id === coinId ? { ...c, collected: true } : c))
    }));
    addPoints(10);
  };

  return (
    <>
      {/* Platforms */}
      {worldData.platforms.map((plat) => {
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
      {worldData.coins
        .filter((c) => !c.collected)
        .map((coin) => (
          <Coin 
            key={coin.id} 
            position={coin.pos} 
            onCollect={() => handleCoinCollect(coin.id)} 
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
    </>
  );
};
