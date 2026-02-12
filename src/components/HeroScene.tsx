"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Sparkles } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";

function JetModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.8, 0.06);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -mouse.y * 0.45, 0.06);
  });

  const metallic = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#FFD700", metalness: 0.94, roughness: 0.14 }),
    [],
  );
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#FF00FF", metalness: 0.62, roughness: 0.28 }),
    [],
  );
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0d1731", metalness: 0.45, roughness: 0.5 }),
    [],
  );

  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1.8}>
      <group ref={groupRef} scale={1.25}>
        <mesh material={metallic} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.24, 3.2, 12, 24]} />
        </mesh>
        <mesh material={accent} position={[0, 0, 1.92]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.24, 0.88, 26]} />
        </mesh>
        <mesh material={metallic} rotation={[0, 0, Math.PI / 2]} position={[0, -0.03, -0.2]}>
          <boxGeometry args={[2.5, 0.11, 0.75]} />
        </mesh>
        <mesh material={accent} rotation={[0, 0, Math.PI / 2]} position={[0, 0.12, -1.2]}>
          <boxGeometry args={[1.1, 0.08, 0.48]} />
        </mesh>
        <mesh material={dark} position={[-0.48, -0.12, -0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.55, 20]} />
        </mesh>
        <mesh material={dark} position={[0.48, -0.12, -0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.55, 20]} />
        </mesh>
      </group>
    </Float>
  );
}

export function HeroScene() {
  return (
    <section className="hero-shell relative h-[580px] overflow-hidden rounded-[2rem] border border-white/15 ambient-grid">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,5,16,0.95)] via-[rgba(12,22,48,0.85)] to-[rgba(36,8,42,0.95)]" />
      <Canvas className="relative z-10" camera={{ position: [0, 1, 6], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 3]} intensity={3.4} color="#FFD700" />
        <directionalLight position={[-3, 1, 2]} intensity={1.7} color="#FF00FF" />
        <Suspense fallback={null}>
          <JetModel />
          <Environment preset="night" />
        </Suspense>
        <Sparkles count={84} scale={[11, 4, 8]} size={2.4} speed={0.16} color="#FFD700" />
      </Canvas>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="absolute left-8 top-20 z-20 max-w-[560px]"
      >
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FF00FF]/50 bg-[rgba(16,20,52,0.75)] px-4 py-1 text-xs tracking-[0.28em] text-[#ff9cff]">
          Cyber-Royal Aviation
        </p>
        <h1 className="royal-text text-4xl font-semibold text-[#fff0c8] sm:text-6xl">
          Aetheris Royal Airways
        </h1>
        <p className="mt-4 max-w-lg text-[#d9e1ff]">
          A simple, premium booking flow with interactive jet visuals and fast ticket confirmation.
        </p>
      </motion.div>
    </section>
  );
}
