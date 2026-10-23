"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { EmotionType, ProducedAct, RigKeyframe } from "@/lib/api";

interface Stage3DProps {
  activePose: RigKeyframe;
  audioAmplitude: number; // 0.0 to 1.0 real-time from Web Audio API AnalyserNode
  currentAct?: ProducedAct | null;
  chyronText: string;
  programTitle: string;
  isPlaying: boolean;
}

const EMOTION_COLORS: Record<EmotionType, string> = {
  SHOCK: "#00f0ff",
  OUTRAGE: "#ff2a54",
  SARCASM: "#a855f7",
  ANALYTICAL: "#38bdf8",
  HYSTERICAL: "#facc15",
};

function CameraRigController({ fov }: { fov: number }) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, Math.min(1, delta * 6));
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function BroadcastAnchorHumanoid({
  pose,
  audioAmplitude,
  emotion,
  isPlaying,
}: {
  pose: RigKeyframe;
  audioAmplitude: number;
  emotion: EmotionType;
  isPlaying: boolean;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const accentColor = EMOTION_COLORS[emotion] || "#38bdf8";

  useFrame((state, delta) => {
    const smooth = pose.interpolation === "STEP_SOUTHPARK" ? 1.0 : Math.min(1, delta * 9);
    const t = state.clock.elapsedTime;
    const idleBreath = Math.sin(t * 2.2) * 0.015;

    if (torsoRef.current) {
      const targetLean = THREE.MathUtils.degToRad(pose.torso_lean);
      torsoRef.current.rotation.x = THREE.MathUtils.lerp(
        torsoRef.current.rotation.x,
        targetLean + idleBreath,
        smooth
      );
    }

    if (headRef.current) {
      const targetPitch = THREE.MathUtils.degToRad(pose.head_pitch);
      const targetYaw = THREE.MathUtils.degToRad(pose.head_yaw);
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        targetPitch,
        smooth
      );
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        targetYaw,
        smooth
      );
    }

    if (jawRef.current) {
      // Combine base keyframe jaw_open with real-time Web Audio API AnalyserNode amplitude
      const liveLipSync = isPlaying
        ? Math.min(1.0, audioAmplitude * 1.45 + pose.jaw_open * 0.25)
        : pose.jaw_open;
      const targetY = -0.17 - liveLipSync * 0.14;
      const targetRotX = liveLipSync * 0.42;
      jawRef.current.position.y = THREE.MathUtils.lerp(
        jawRef.current.position.y,
        targetY,
        0.45
      );
      jawRef.current.rotation.x = THREE.MathUtils.lerp(
        jawRef.current.rotation.x,
        targetRotX,
        0.45
      );
    }

    if (leftBrowRef.current && rightBrowRef.current) {
      const browOffset = pose.brow_raise * 0.055;
      const browTilt = pose.brow_raise * 0.28;
      leftBrowRef.current.position.y = THREE.MathUtils.lerp(
        leftBrowRef.current.position.y,
        0.13 + browOffset,
        smooth
      );
      rightBrowRef.current.position.y = THREE.MathUtils.lerp(
        rightBrowRef.current.position.y,
        0.13 + browOffset,
        smooth
      );
      leftBrowRef.current.rotation.z = THREE.MathUtils.lerp(
        leftBrowRef.current.rotation.z,
        browTilt,
        smooth
      );
      rightBrowRef.current.rotation.z = THREE.MathUtils.lerp(
        rightBrowRef.current.rotation.z,
        -browTilt,
        smooth
      );
    }

    if (leftArmRef.current) {
      const targetLeftArm = -pose.left_arm_ik * 1.35 + (isPlaying ? Math.sin(t * 5) * 0.06 * audioAmplitude : 0);
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x,
        targetLeftArm,
        smooth
      );
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.z,
        0.18 + pose.left_arm_ik * 0.25,
        smooth
      );
    }

    if (rightArmRef.current) {
      const targetRightArm = -pose.right_arm_ik * 1.35 + (isPlaying ? Math.cos(t * 5) * 0.06 * audioAmplitude : 0);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.x,
        targetRightArm,
        smooth
      );
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.z,
        -0.18 - pose.right_arm_ik * 0.25,
        smooth
      );
    }
  });

  return (
    <group position={[0, -0.35, 0]}>
      {/* Broadcast Anchor Desk */}
      <group position={[0, 0.42, 0.72]}>
        <RoundedBox args={[3.2, 0.78, 0.9]} radius={0.08} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.25} />
        </RoundedBox>
        {/* Glowing News Desk LED Strip */}
        <mesh position={[0, 0.22, 0.46]}>
          <boxGeometry args={[3.05, 0.06, 0.02]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={2.4} />
        </mesh>
        {/* Broadcast Microphone on Desk */}
        <group position={[0.42, 0.54, -0.1]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.3, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[0.3, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.09, 12, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      </group>

      {/* Articulated Torso Group */}
      <group ref={torsoRef} position={[0, 0.85, 0]}>
        {/* Suit Jacket Torso */}
        <RoundedBox args={[0.82, 0.95, 0.44]} radius={0.12} smoothness={4} position={[0, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.35} roughness={0.55} />
        </RoundedBox>

        {/* Shirt & Tie */}
        <mesh position={[0, 0.56, 0.225]}>
          <boxGeometry args={[0.24, 0.58, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.52, 0.24]}>
          <boxGeometry args={[0.07, 0.48, 0.02]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.45} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.98, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.22, 20]} />
          <meshStandardMaterial color="#e2b897" roughness={0.45} />
        </mesh>

        {/* Articulated Head Group (head_pitch, head_yaw) */}
        <group ref={headRef} position={[0, 1.24, 0]}>
          {/* Cranium */}
          <RoundedBox args={[0.48, 0.52, 0.46]} radius={0.14} smoothness={4} castShadow>
            <meshStandardMaterial color="#ecc5a8" roughness={0.38} />
          </RoundedBox>

          {/* Stylized Hair */}
          <RoundedBox args={[0.52, 0.18, 0.5]} radius={0.07} position={[0, 0.24, -0.01]} castShadow>
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </RoundedBox>

          {/* Eyes */}
          <mesh position={[-0.11, 0.04, 0.235]}>
            <sphereGeometry args={[0.042, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.11, 0.04, 0.235]}>
            <sphereGeometry args={[0.042, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Eye Specular Highlights */}
          <mesh position={[-0.098, 0.052, 0.27]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.122, 0.052, 0.27]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Articulated Eyebrows (brow_raise) */}
          <mesh ref={leftBrowRef} position={[-0.11, 0.13, 0.24]}>
            <boxGeometry args={[0.12, 0.026, 0.03]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh ref={rightBrowRef} position={[0.11, 0.13, 0.24]}>
            <boxGeometry args={[0.12, 0.026, 0.03]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>

          {/* Inner Mouth Cavity */}
          <mesh position={[0, -0.14, 0.21]}>
            <boxGeometry args={[0.22, 0.14, 0.08]} />
            <meshBasicMaterial color="#450a0a" />
          </mesh>

          {/* Articulated Jaw Bone (jaw_open + Web Audio AnalyserNode Lip-Sync) */}
          <mesh ref={jawRef} position={[0, -0.17, 0.04]} castShadow>
            <boxGeometry args={[0.38, 0.15, 0.42]} />
            <meshStandardMaterial color="#e2b897" roughness={0.42} />
          </mesh>
        </group>

        {/* Left Arm IK Group */}
        <group ref={leftArmRef} position={[-0.5, 0.78, 0]}>
          <RoundedBox args={[0.18, 0.62, 0.18]} radius={0.06} position={[0, -0.26, 0]} castShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, -0.62, 0.05]} castShadow>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#ecc5a8" roughness={0.4} />
          </mesh>
        </group>

        {/* Right Arm IK Group */}
        <group ref={rightArmRef} position={[0.5, 0.78, 0]}>
          <RoundedBox args={[0.18, 0.62, 0.18]} radius={0.06} position={[0, -0.26, 0]} castShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, -0.62, 0.05]} castShadow>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#ecc5a8" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Studio Background Cyclorama Wall & LED Rings */}
      <group position={[0, 1.4, -2.2]}>
        <mesh receiveShadow>
          <planeGeometry args={[12, 6]} />
          <meshStandardMaterial color="#050814" metalness={0.4} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.2, 0.05]}>
          <ringGeometry args={[1.35, 1.45, 64]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
        <mesh position={[0, 0.2, 0.04]}>
          <ringGeometry args={[1.85, 1.88, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
        </mesh>
      </group>
    </group>
  );
}

export default function Stage3D({
  activePose,
  audioAmplitude,
  currentAct,
  chyronText,
  programTitle,
  isPlaying,
}: Stage3DProps) {
  const emotion: EmotionType = currentAct?.dominant_emotion || "ANALYTICAL";
  const accentHex = useMemo(() => EMOTION_COLORS[emotion] || "#38bdf8", [emotion]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#05070f] via-[#090d1c] to-[#04060c] overflow-hidden select-none">
      <Canvas
        shadows
        camera={{ position: [0, 1.15, 3.35], fov: activePose.camera_fov || 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <CameraRigController fov={activePose.camera_fov || 42} />
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[2.5, 4.2, 3.5]}
          intensity={2.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <spotLight
          position={[-3.2, 3.0, -1.5]}
          intensity={3.2}
          color={accentHex}
          angle={0.55}
          penumbra={0.8}
        />
        <pointLight position={[2.8, 1.8, -1.2]} intensity={1.8} color="#38bdf8" />

        <BroadcastAnchorHumanoid
          pose={activePose}
          audioAmplitude={audioAmplitude}
          emotion={emotion}
          isPlaying={isPlaying}
        />

        <ContactShadows
          position={[0, -0.35, 0]}
          opacity={0.6}
          scale={8}
          blur={2.4}
          far={4}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.9}
          target={[0, 0.85, 0]}
        />
      </Canvas>

      {/* Broadcast Camera Telemetry HUD Overlay */}
      <div className="pointer-events-none absolute top-20 left-6 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>CAM 01 • {currentAct?.camera_shot_label || "35mm Studio Prime"}</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">FOV {Math.round(activePose.camera_fov)}°</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-300">{activePose.interpolation}</span>
        </div>
        {currentAct && (
          <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-400">
            Mic Level FFT: {(audioAmplitude * 100).toFixed(0)}% • Emoção:{" "}
            <span className="text-white font-semibold">{currentAct.dominant_emotion}</span>
          </div>
        )}
      </div>

      {/* Broadcast Lower-Third Chyron */}
      <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 w-[min(860px,90vw)]">
        <div className="rounded-xl overflow-hidden border border-white/15 shadow-2xl backdrop-blur-xl bg-slate-950/80">
          <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-cyan-700 text-[11px] font-bold tracking-wider uppercase text-white">
            <span>🔴 AO VIVO • {programTitle}</span>
            <span>
              {currentAct
                ? `ATO 0${currentAct.act_number} • ${currentAct.speaker_name} (${currentAct.speaker_role})`
                : "ESTÚDIO NEURAL PRONTO"}
            </span>
          </div>
          <div className="px-5 py-3">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-0.5">
              {chyronText}
            </div>
            <p className="text-sm md:text-base font-medium text-slate-100 leading-snug line-clamp-2">
              {currentAct?.dialogue_text ||
                "Digite uma pauta, cole uma URL ou envie um vídeo/áudio na Gemini OmniBar abaixo para iniciar a transmissão com os 3 agentes."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
