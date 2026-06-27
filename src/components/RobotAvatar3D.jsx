import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles, Environment, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';

function AICore({ speaking }) {
  const materialRef = useRef();
  const sphereRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();
  
  const targetDistort = speaking ? 0.6 : 0.2;
  const targetSpeed = speaking ? 6 : 2;
  const targetScale = speaking ? 1.2 : 1.0;
  const targetEmissive = speaking ? 2 : 0.5;

  useFrame((state, delta) => {
    // Smoothly interpolate material properties
    if (materialRef.current) {
      materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.1);
      materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.1);
    }
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(THREE.MathUtils.lerp(sphereRef.current.scale.x, targetScale, 0.1));
    }
    
    // Rotate rings
    const rotationSpeed = speaking ? 3 : 0.5;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * rotationSpeed * 0.5;
      ring1Ref.current.rotation.y += delta * rotationSpeed * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * rotationSpeed * 0.6;
      ring2Ref.current.rotation.z += delta * rotationSpeed * 0.4;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x -= delta * rotationSpeed * 0.4;
      ring3Ref.current.rotation.z += delta * rotationSpeed * 0.5;
    }
  });

  return (
    <group>
      {/* Central Pulsing Energy Core */}
      <Sphere ref={sphereRef} args={[1.2, 64, 64]}>
        <MeshDistortMaterial
          ref={materialRef}
          color={speaking ? "#0ea5e9" : "#1e40af"}
          emissive={speaking ? "#38bdf8" : "#1d4ed8"}
          emissiveIntensity={speaking ? 2 : 0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.8}
          roughness={0.2}
          radius={1}
        />
      </Sphere>

      {/* Orbiting Tech Rings */}
      <Torus ref={ring1Ref} args={[2.0, 0.05, 16, 100]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={speaking ? 1.5 : 0.2} metalness={0.9} roughness={0.1} />
      </Torus>
      <Torus ref={ring2Ref} args={[2.4, 0.03, 16, 100]} rotation={[0, Math.PI/3, 0]}>
        <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={speaking ? 1.5 : 0.1} metalness={0.9} roughness={0.1} />
      </Torus>
      <Torus ref={ring3Ref} args={[2.8, 0.02, 16, 100]} rotation={[0, 0, Math.PI/4]}>
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={speaking ? 1.0 : 0.1} metalness={1} roughness={0} />
      </Torus>

      {/* Inner Glow Light */}
      <pointLight color="#38bdf8" intensity={speaking ? 50 : 10} distance={10} />
      
      {/* Floating Sparkles (Data Particles) */}
      <Sparkles count={ speaking ? 150 : 50 } scale={6} size={4} speed={speaking ? 0.8 : 0.2} opacity={speaking ? 0.8 : 0.3} color="#bae6fd" />
    </group>
  );
}

export default function RobotAvatar3D({ speaking, size = 150 }) {
  return (
    <div style={{ width: size, height: size, margin: '0 auto', filter: speaking ? 'drop-shadow(0 0 30px rgba(14,165,233,0.5))' : 'drop-shadow(0 0 10px rgba(30,64,175,0.3))', transition: 'filter 0.5s ease-in-out' }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} style={{ background: 'transparent' }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <Environment preset="city" />
        
        <Float speed={speaking ? 4 : 2} rotationIntensity={speaking ? 1.5 : 0.5} floatIntensity={speaking ? 2 : 1}>
          <AICore speaking={speaking} />
        </Float>
      </Canvas>
    </div>
  );
}
