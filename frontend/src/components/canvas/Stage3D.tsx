"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  RoundedBox,
  TransformControls,
  Grid,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import {
  CameraBookmark,
  CharacterSpec,
  EmotionType,
  ProducedAct,
  RigKeyframe,
  SceneObjectItem,
  StudioLayer,
  StudioLightConfig,
  ViewportQualityConfig,
  resolveBackendAssetUrl,
} from "@/lib/api";

interface Stage3DProps {
  activePose: RigKeyframe;
  audioAmplitude: number;
  currentAct?: ProducedAct | null;
  chyronText: string;
  programTitle: string;
  isPlaying: boolean;
  timelineOpen: boolean;
  layers: StudioLayer[];
  sceneObjects: SceneObjectItem[];
  characters: CharacterSpec[];
  lighting: StudioLightConfig;
  activeCamera: CameraBookmark;
  quality: ViewportQualityConfig;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  transformMode: "translate" | "rotate" | "scale";
  onUpdateObjectTransform: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void;
}

const EMOTION_COLORS: Record<EmotionType, string> = {
  SHOCK: "#00f0ff",
  OUTRAGE: "#ff2a54",
  SARCASM: "#a855f7",
  ANALYTICAL: "#38bdf8",
  HYSTERICAL: "#facc15",
};

function CameraBookmarkController({
  bookmark,
  poseFov,
}: {
  bookmark: CameraBookmark;
  poseFov: number;
}) {
  const { camera } = useThree();
  const targetVec = useMemo(
    () => new THREE.Vector3(...bookmark.position),
    [bookmark.position]
  );

  useEffect(() => {
    camera.position.set(...bookmark.position);
    camera.lookAt(...bookmark.target);
  }, [bookmark.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = poseFov || bookmark.fov || 42;
      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        targetFov,
        Math.min(1, delta * 6)
      );
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function FpsTelemetryTracker({ onFps }: { onFps: (fps: number) => void }) {
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - prevTime.current >= 600) {
      const fps = Math.round((frames.current * 1000) / (now - prevTime.current));
      onFps(fps);
      frames.current = 0;
      prevTime.current = now;
    }
  });
  return null;
}

/**
 * Multi-Format 3D Model Loader Component
 * Supports: .glb, .gltf, .obj, .fbx, .stl, .dae (Collada), .ply
 */
function Imported3DModelMesh({
  url,
  format,
  color,
  metalness,
  roughness,
  wireframe,
  castShadow,
  receiveShadow,
}: {
  url: string;
  format: string;
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  const [loadedGroup, setLoadedGroup] = useState<THREE.Object3D | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const fullUrl = resolveBackendAssetUrl(url);
    const ext = (format || url.split(".").pop() || "glb").toLowerCase();

    const applyMaterialAndShadows = (root: THREE.Object3D) => {
      // Auto-normalize bounding box to reasonable studio scale if huge or microscopic
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 12 || (maxDim > 0 && maxDim < 0.08)) {
        const normFactor = 1.6 / maxDim;
        root.scale.multiplyScalar(normFactor);
      }

      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = castShadow;
          mesh.receiveShadow = receiveShadow;
          if (!mesh.material) {
            mesh.material = new THREE.MeshStandardMaterial({
              color,
              metalness,
              roughness,
              wireframe,
            });
          } else if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if ("wireframe" in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe;
            });
          } else if ("wireframe" in mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).wireframe = wireframe;
          }
        }
      });
    };

    try {
      if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.load(
          fullUrl,
          (gltf) => {
            if (cancelled) return;
            applyMaterialAndShadows(gltf.scene);
            setLoadedGroup(gltf.scene);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      } else if (ext === "obj") {
        const loader = new OBJLoader();
        loader.load(
          fullUrl,
          (obj) => {
            if (cancelled) return;
            obj.traverse((c) => {
              if ((c as THREE.Mesh).isMesh) {
                (c as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                  color,
                  metalness,
                  roughness,
                  wireframe,
                });
              }
            });
            applyMaterialAndShadows(obj);
            setLoadedGroup(obj);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      } else if (ext === "fbx") {
        const loader = new FBXLoader();
        loader.load(
          fullUrl,
          (fbx) => {
            if (cancelled) return;
            applyMaterialAndShadows(fbx);
            setLoadedGroup(fbx);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      } else if (ext === "dae") {
        const loader = new ColladaLoader();
        loader.load(
          fullUrl,
          (collada) => {
            if (cancelled) return;
            applyMaterialAndShadows(collada.scene);
            setLoadedGroup(collada.scene);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      } else if (ext === "stl") {
        const loader = new STLLoader();
        loader.load(
          fullUrl,
          (geom) => {
            if (cancelled) return;
            geom.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({
              color,
              metalness,
              roughness,
              wireframe,
            });
            const mesh = new THREE.Mesh(geom, mat);
            const grp = new THREE.Group();
            grp.add(mesh);
            applyMaterialAndShadows(grp);
            setLoadedGroup(grp);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      } else if (ext === "ply") {
        const loader = new PLYLoader();
        loader.load(
          fullUrl,
          (geom) => {
            if (cancelled) return;
            geom.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({
              color,
              metalness,
              roughness,
              wireframe,
            });
            const mesh = new THREE.Mesh(geom, mat);
            const grp = new THREE.Group();
            grp.add(mesh);
            applyMaterialAndShadows(grp);
            setLoadedGroup(grp);
          },
          undefined,
          (err) => !cancelled && setLoadError(String(err))
        );
      }
    } catch (e) {
      setLoadError(String(e));
    }

    return () => {
      cancelled = true;
    };
  }, [url, format, color, metalness, roughness, wireframe, castShadow, receiveShadow]);

  if (loadError || !loadedGroup) {
    return (
      <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.08} castShadow={castShadow}>
        <meshStandardMaterial
          color={loadError ? "#ef4444" : color}
          metalness={metalness}
          roughness={roughness}
          wireframe={wireframe}
        />
      </RoundedBox>
    );
  }

  return <primitive object={loadedGroup} />;
}

/**
 * Renders any SceneObjectItem (imported 3D model or procedural broadcast studio prop)
 */
function StudioSceneObjectNode({
  item,
  wireframe,
  isSelected,
  onSelect,
  transformMode,
  onTransformEnd,
}: {
  item: SceneObjectItem;
  wireframe: boolean;
  isSelected: boolean;
  onSelect: () => void;
  transformMode: "translate" | "rotate" | "scale";
  onTransformEnd: (
    pos: [number, number, number],
    rot: [number, number, number],
    scl: [number, number, number]
  ) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rotRad: [number, number, number] = [
    THREE.MathUtils.degToRad(item.rotation[0] || 0),
    THREE.MathUtils.degToRad(item.rotation[1] || 0),
    THREE.MathUtils.degToRad(item.rotation[2] || 0),
  ];

  const meshContent = (
    <group
      ref={groupRef}
      position={item.position}
      rotation={rotRad}
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        if (!item.locked) onSelect();
      }}
    >
      {item.kind === "imported_model" && item.asset_url ? (
        <Imported3DModelMesh
          url={item.asset_url}
          format={item.format || "glb"}
          color={item.color}
          metalness={item.metalness}
          roughness={item.roughness}
          wireframe={wireframe}
          castShadow={item.cast_shadow}
          receiveShadow={item.receive_shadow}
        />
      ) : item.kind === "anchor_desk" ? (
        <group>
          <RoundedBox
            args={[3.2, 0.78, 0.9]}
            radius={0.08}
            smoothness={4}
            castShadow={item.cast_shadow}
            receiveShadow={item.receive_shadow}
          >
            <meshStandardMaterial
              color={item.color}
              metalness={item.metalness}
              roughness={item.roughness}
              wireframe={wireframe}
            />
          </RoundedBox>
          <mesh position={[0, 0.22, 0.46]}>
            <boxGeometry args={[3.05, 0.06, 0.02]} />
            <meshStandardMaterial
              color={item.emissive || "#00f0ff"}
              emissive={item.emissive || "#00f0ff"}
              emissiveIntensity={item.emissive_intensity || 2.0}
              wireframe={wireframe}
            />
          </mesh>
          {/* Desk Broadcast Microphone */}
          <group position={[0.42, 0.54, -0.1]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.03, 0.3, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.18, 0]} rotation={[0.3, 0, 0]}>
              <capsuleGeometry args={[0.045, 0.09, 12, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        </group>
      ) : item.kind === "led_wall" ? (
        <group>
          <mesh receiveShadow={item.receive_shadow}>
            <planeGeometry args={[12, 6]} />
            <meshStandardMaterial
              color={item.color}
              metalness={item.metalness}
              roughness={item.roughness}
              wireframe={wireframe}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.05]}>
            <ringGeometry args={[1.35, 1.46, 64]} />
            <meshBasicMaterial color={item.emissive || "#00f0ff"} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, 0.2, 0.04]}>
            <ringGeometry args={[1.85, 1.9, 64]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </mesh>
        </group>
      ) : item.kind === "studio_camera" ? (
        <group>
          {/* Pedestal Base & Column */}
          <mesh position={[0, 0.55, 0]} castShadow={item.cast_shadow}>
            <cylinderGeometry args={[0.12, 0.28, 1.1, 20]} />
            <meshStandardMaterial color={item.color} metalness={0.8} roughness={0.25} wireframe={wireframe} />
          </mesh>
          {/* Camera Body & Mattebox */}
          <RoundedBox args={[0.36, 0.32, 0.58]} radius={0.04} position={[0, 1.2, 0]} castShadow={item.cast_shadow}>
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} wireframe={wireframe} />
          </RoundedBox>
          <mesh position={[0, 1.2, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.09, 0.22, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Tally On-Air Red LED */}
          <mesh position={[0, 1.4, 0.22]}>
            <boxGeometry args={[0.12, 0.04, 0.04]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
          </mesh>
        </group>
      ) : item.kind === "teleprompter" ? (
        <group>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.2, 1.3, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.4, 0.05]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.65, 0.48, 0.03]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.9}
              transparent
              opacity={0.75}
            />
          </mesh>
        </group>
      ) : item.kind === "sofa" ? (
        <group>
          <RoundedBox args={[2.1, 0.42, 0.85]} radius={0.1} position={[0, 0.21, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={item.color} roughness={0.65} wireframe={wireframe} />
          </RoundedBox>
          <RoundedBox args={[2.1, 0.55, 0.24]} radius={0.08} position={[0, 0.58, -0.3]} castShadow>
            <meshStandardMaterial color={item.color} roughness={0.65} wireframe={wireframe} />
          </RoundedBox>
        </group>
      ) : item.kind === "podium" ? (
        <group>
          <RoundedBox args={[0.75, 1.15, 0.55]} radius={0.06} position={[0, 0.58, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={item.color} metalness={0.6} roughness={0.3} wireframe={wireframe} />
          </RoundedBox>
          <mesh position={[0, 0.85, 0.28]}>
            <boxGeometry args={[0.55, 0.05, 0.02]} />
            <meshStandardMaterial color={item.emissive || "#00f0ff"} emissive={item.emissive || "#00f0ff"} emissiveIntensity={2} />
          </mesh>
        </group>
      ) : item.kind === "plant" ? (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.18, 0.5, 16]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, 0]} castShadow>
            <dodecahedronGeometry args={[0.42, 1]} />
            <meshStandardMaterial color={item.color || "#15803d"} roughness={0.6} wireframe={wireframe} />
          </mesh>
        </group>
      ) : item.kind === "truss" ? (
        <group>
          <mesh castShadow>
            <boxGeometry args={[6.5, 0.18, 0.18]} />
            <meshStandardMaterial color={item.color} metalness={0.85} roughness={0.2} wireframe={wireframe} />
          </mesh>
          {[-2.2, -0.8, 0.8, 2.2].map((lx, i) => (
            <mesh key={i} position={[lx, -0.18, 0]}>
              <cylinderGeometry args={[0.08, 0.14, 0.22, 12]} />
              <meshStandardMaterial color="#0f172a" emissive={item.emissive || "#38bdf8"} emissiveIntensity={1.4} />
            </mesh>
          ))}
        </group>
      ) : item.kind === "cylinder" ? (
        <mesh castShadow={item.cast_shadow} receiveShadow={item.receive_shadow}>
          <cylinderGeometry args={[0.45, 0.45, 1.2, 28]} />
          <meshStandardMaterial color={item.color} metalness={item.metalness} roughness={item.roughness} wireframe={wireframe} />
        </mesh>
      ) : item.kind === "plane" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={item.receive_shadow}>
          <planeGeometry args={[4, 4]} />
          <meshStandardMaterial color={item.color} metalness={item.metalness} roughness={item.roughness} wireframe={wireframe} />
        </mesh>
      ) : (
        <RoundedBox args={[0.85, 0.85, 0.85]} radius={0.08} castShadow={item.cast_shadow} receiveShadow={item.receive_shadow}>
          <meshStandardMaterial color={item.color} metalness={item.metalness} roughness={item.roughness} wireframe={wireframe} />
        </RoundedBox>
      )}
    </group>
  );

  if (isSelected && !item.locked) {
    return (
      <TransformControls
        mode={transformMode}
        onMouseUp={() => {
          if (!groupRef.current) return;
          const p = groupRef.current.position;
          const r = groupRef.current.rotation;
          const s = groupRef.current.scale;
          onTransformEnd(
            [Number(p.x.toFixed(2)), Number(p.y.toFixed(2)), Number(p.z.toFixed(2))],
            [
              Number(THREE.MathUtils.radToDeg(r.x).toFixed(1)),
              Number(THREE.MathUtils.radToDeg(r.y).toFixed(1)),
              Number(THREE.MathUtils.radToDeg(r.z).toFixed(1)),
            ],
            [Number(s.x.toFixed(2)), Number(s.y.toFixed(2)), Number(s.z.toFixed(2))]
          );
        }}
      >
        {meshContent}
      </TransformControls>
    );
  }

  return meshContent;
}

/**
 * Parametric 3D Humanoid Character with customizable hair, hat, glasses, suit/skin colors,
 * or custom imported 3D rig, plus real-time Web Audio AnalyserNode lip-sync
 */
function Customizable3DCharacter({
  spec,
  pose,
  audioAmplitude,
  isPlaying,
  wireframe,
  isSelected,
  onSelect,
}: {
  spec: CharacterSpec;
  pose: RigKeyframe;
  audioAmplitude: number;
  isPlaying: boolean;
  wireframe: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const smooth =
      pose.interpolation === "STEP_SOUTHPARK" ? 1.0 : Math.min(1, delta * 9);
    const t = state.clock.elapsedTime;
    const idleBreath = Math.sin(t * 2.2 + (spec.is_active_speaker ? 0 : 1.4)) * 0.015;
    const activeFactor = spec.is_active_speaker ? 1.0 : 0.25;

    if (torsoRef.current) {
      const targetLean = THREE.MathUtils.degToRad(pose.torso_lean * activeFactor);
      torsoRef.current.rotation.x = THREE.MathUtils.lerp(
        torsoRef.current.rotation.x,
        targetLean + idleBreath,
        smooth
      );
    }

    if (headRef.current) {
      const targetPitch = THREE.MathUtils.degToRad(pose.head_pitch * activeFactor);
      const targetYaw = THREE.MathUtils.degToRad(pose.head_yaw * activeFactor);
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
      const liveLipSync =
        isPlaying && spec.is_active_speaker
          ? Math.min(1.0, audioAmplitude * 1.45 + pose.jaw_open * 0.25)
          : spec.is_active_speaker
          ? pose.jaw_open
          : 0.06;
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
      const browOffset = pose.brow_raise * 0.055 * activeFactor;
      const browTilt = pose.brow_raise * 0.28 * activeFactor;
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
      const targetLeftArm =
        -pose.left_arm_ik * 1.35 * activeFactor +
        (isPlaying && spec.is_active_speaker
          ? Math.sin(t * 5) * 0.06 * audioAmplitude
          : 0);
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x,
        targetLeftArm,
        smooth
      );
    }

    if (rightArmRef.current) {
      const targetRightArm =
        -pose.right_arm_ik * 1.35 * activeFactor +
        (isPlaying && spec.is_active_speaker
          ? Math.cos(t * 5) * 0.06 * audioAmplitude
          : 0);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.x,
        targetRightArm,
        smooth
      );
    }
  });

  const rotRad: [number, number, number] = [
    THREE.MathUtils.degToRad(spec.rotation[0] || 0),
    THREE.MathUtils.degToRad(spec.rotation[1] || 0),
    THREE.MathUtils.degToRad(spec.rotation[2] || 0),
  ];

  return (
    <group
      position={spec.position}
      rotation={rotRad}
      scale={[spec.scale, spec.scale, spec.scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (!spec.locked) onSelect();
      }}
    >
      {/* Selection Ring Indicator */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 32]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
      )}

      {spec.custom_3d_model_url ? (
        <group position={[0, 0.85, 0]}>
          <Imported3DModelMesh
            url={spec.custom_3d_model_url}
            format={spec.custom_3d_format || "glb"}
            color={spec.suit_color}
            metalness={0.3}
            roughness={0.5}
            wireframe={wireframe}
            castShadow={true}
            receiveShadow={true}
          />
        </group>
      ) : (
        <group ref={torsoRef} position={[0, 0.85, 0]}>
          {/* Suit Jacket Torso */}
          <RoundedBox
            args={[0.82, 0.95, 0.44]}
            radius={0.12}
            smoothness={4}
            position={[0, 0.42, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={spec.suit_color}
              metalness={0.35}
              roughness={0.55}
              wireframe={wireframe}
            />
          </RoundedBox>

          {/* Shirt & Tie */}
          <mesh position={[0, 0.56, 0.225]}>
            <boxGeometry args={[0.24, 0.58, 0.02]} />
            <meshStandardMaterial color={spec.shirt_color} roughness={0.4} wireframe={wireframe} />
          </mesh>
          <mesh position={[0, 0.52, 0.24]}>
            <boxGeometry args={[0.07, 0.48, 0.02]} />
            <meshStandardMaterial
              color={spec.tie_color}
              emissive={spec.tie_color}
              emissiveIntensity={0.45}
              wireframe={wireframe}
            />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 0.98, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.13, 0.22, 20]} />
            <meshStandardMaterial color={spec.skin_color} roughness={0.45} wireframe={wireframe} />
          </mesh>

          {/* Articulated Head Group */}
          <group ref={headRef} position={[0, 1.24, 0]}>
            {/* Cranium */}
            <RoundedBox args={[0.48, 0.52, 0.46]} radius={0.14} smoothness={4} castShadow>
              <meshStandardMaterial color={spec.skin_color} roughness={0.38} wireframe={wireframe} />
            </RoundedBox>

            {/* Hair Styles */}
            {spec.hair_style !== "bald" && (
              <group>
                {spec.hair_style === "mohawk" ? (
                  <RoundedBox args={[0.12, 0.34, 0.52]} radius={0.04} position={[0, 0.32, 0]} castShadow>
                    <meshStandardMaterial color={spec.hair_color} roughness={0.6} wireframe={wireframe} />
                  </RoundedBox>
                ) : spec.hair_style === "bob" ? (
                  <RoundedBox args={[0.56, 0.42, 0.52]} radius={0.12} position={[0, 0.12, -0.02]} castShadow>
                    <meshStandardMaterial color={spec.hair_color} roughness={0.65} wireframe={wireframe} />
                  </RoundedBox>
                ) : (
                  <RoundedBox args={[0.52, 0.18, 0.5]} radius={0.07} position={[0, 0.24, -0.01]} castShadow>
                    <meshStandardMaterial color={spec.hair_color} roughness={0.7} wireframe={wireframe} />
                  </RoundedBox>
                )}
              </group>
            )}

            {/* Hat / Accessory Styles */}
            {spec.hat_style === "beanie" && (
              <mesh position={[0, 0.28, 0]} castShadow>
                <sphereGeometry args={[0.28, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                <meshStandardMaterial color={spec.hat_color} roughness={0.8} wireframe={wireframe} />
              </mesh>
            )}
            {spec.hat_style === "fedora" && (
              <group position={[0, 0.29, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.38, 0.38, 0.03, 24]} />
                  <meshStandardMaterial color={spec.hat_color} roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.11, 0]}>
                  <cylinderGeometry args={[0.21, 0.24, 0.2, 24]} />
                  <meshStandardMaterial color={spec.hat_color} roughness={0.6} />
                </mesh>
              </group>
            )}
            {spec.hat_style === "crown" && (
              <mesh position={[0, 0.34, 0]}>
                <cylinderGeometry args={[0.24, 0.2, 0.16, 8]} />
                <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.15} />
              </mesh>
            )}
            {spec.hat_style === "headphones" && (
              <group>
                <mesh position={[-0.27, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.06, 16]} />
                  <meshStandardMaterial color={spec.hat_color} metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0.27, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.06, 16]} />
                  <meshStandardMaterial color={spec.hat_color} metalness={0.6} roughness={0.3} />
                </mesh>
              </group>
            )}

            {/* Glasses */}
            {spec.glasses && (
              <group position={[0, 0.04, 0.245]}>
                <mesh position={[-0.11, 0, 0]}>
                  <ringGeometry args={[0.048, 0.064, 20]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <mesh position={[0.11, 0, 0]}>
                  <ringGeometry args={[0.048, 0.064, 20]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </group>
            )}

            {/* Eyes */}
            <mesh position={[-0.11, 0.04, 0.235]} scale={spec.eye_scale}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.11, 0.04, 0.235]} scale={spec.eye_scale}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* Eyebrows */}
            <mesh ref={leftBrowRef} position={[-0.11, 0.13, 0.24]}>
              <boxGeometry args={[0.12, 0.026, 0.03]} />
              <meshStandardMaterial color={spec.hair_color} />
            </mesh>
            <mesh ref={rightBrowRef} position={[0.11, 0.13, 0.24]}>
              <boxGeometry args={[0.12, 0.026, 0.03]} />
              <meshStandardMaterial color={spec.hair_color} />
            </mesh>

            {/* Inner Mouth Cavity */}
            <mesh position={[0, -0.14, 0.21]}>
              <boxGeometry args={[0.22, 0.14, 0.08]} />
              <meshBasicMaterial color="#450a0a" />
            </mesh>

            {/* Articulated Jaw Bone */}
            <mesh ref={jawRef} position={[0, -0.17, 0.04]} castShadow>
              <boxGeometry args={[0.38, 0.15, 0.42]} />
              <meshStandardMaterial color={spec.skin_color} roughness={0.42} wireframe={wireframe} />
            </mesh>
          </group>

          {/* Left Arm IK */}
          <group ref={leftArmRef} position={[-0.5, 0.78, 0]}>
            <RoundedBox args={[0.18, 0.62, 0.18]} radius={0.06} position={[0, -0.26, 0]} castShadow>
              <meshStandardMaterial color={spec.suit_color} roughness={0.5} wireframe={wireframe} />
            </RoundedBox>
            <mesh position={[0, -0.62, 0.05]} castShadow>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color={spec.skin_color} roughness={0.4} wireframe={wireframe} />
            </mesh>
          </group>

          {/* Right Arm IK */}
          <group ref={rightArmRef} position={[0.5, 0.78, 0]}>
            <RoundedBox args={[0.18, 0.62, 0.18]} radius={0.06} position={[0, -0.26, 0]} castShadow>
              <meshStandardMaterial color={spec.suit_color} roughness={0.5} wireframe={wireframe} />
            </RoundedBox>
            <mesh position={[0, -0.62, 0.05]} castShadow>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color={spec.skin_color} roughness={0.4} wireframe={wireframe} />
            </mesh>
          </group>
        </group>
      )}
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
  timelineOpen,
  layers,
  sceneObjects,
  characters,
  lighting,
  activeCamera,
  quality,
  selectedItemId,
  onSelectItem,
  transformMode,
  onUpdateObjectTransform,
}: Stage3DProps) {
  const [fps, setFps] = useState<number>(60);
  const emotion: EmotionType = currentAct?.dominant_emotion || "ANALYTICAL";
  const emotionHex = useMemo(
    () => EMOTION_COLORS[emotion] || "#38bdf8",
    [emotion]
  );

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.visible).map((l) => l.id)),
    [layers]
  );

  const visibleObjects = useMemo(
    () =>
      sceneObjects.filter(
        (obj) => obj.visible && visibleLayerIds.has(obj.layer_id)
      ),
    [sceneObjects, visibleLayerIds]
  );

  const visibleCharacters = useMemo(
    () =>
      characters.filter(
        (ch) =>
          ch.visible &&
          (ch.mode === "3D" || ch.mode === "BOTH") &&
          visibleLayerIds.has(ch.layer_id)
      ),
    [characters, visibleLayerIds]
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: `linear-gradient(to bottom, ${lighting.background_top}, ${lighting.background_bottom})`,
      }}
    >
      <Canvas
        onPointerMissed={() => onSelectItem(null)}
        shadows={quality.shadows}
        dpr={[quality.dpr_min, quality.dpr_max]}
        camera={{
          position: activeCamera.position,
          fov: activePose.camera_fov || activeCamera.fov || 42,
        }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: quality.antialias,
          powerPreference: "high-performance",
        }}
      >
        <FpsTelemetryTracker onFps={setFps} />
        <CameraBookmarkController
          bookmark={activeCamera}
          poseFov={activePose.camera_fov}
        />

        {lighting.fog_enabled && (
          <fog
            attach="fog"
            args={[lighting.fog_color, lighting.fog_near, lighting.fog_far]}
          />
        )}

        {/* Programmable Studio Lighting Scheme */}
        <ambientLight
          intensity={lighting.ambient_intensity}
          color={lighting.ambient_color}
        />
        <directionalLight
          position={lighting.key_position}
          intensity={lighting.key_intensity}
          color={lighting.key_color}
          castShadow={quality.shadows}
          shadow-mapSize-width={quality.shadow_map_size}
          shadow-mapSize-height={quality.shadow_map_size}
        />
        <spotLight
          position={lighting.rim_position}
          intensity={lighting.rim_intensity}
          color={lighting.rim_color || emotionHex}
          angle={0.55}
          penumbra={0.8}
        />
        <pointLight
          position={lighting.fill_position}
          intensity={lighting.fill_intensity}
          color={lighting.fill_color}
        />

        {/* Studio Floor Grid & Helpers */}
        {quality.show_grid && (
          <Grid
            position={[0, -0.35, 0]}
            args={[18, 18]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1e293b"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#0284c7"
            fadeDistance={16}
            fadeStrength={1}
          />
        )}
        {quality.show_axes && <axesHelper args={[2]} />}

        {/* Render All Visible 3D Studio Objects & Imported Models */}
        {visibleObjects.map((item) => (
          <StudioSceneObjectNode
            key={item.id}
            item={item}
            wireframe={quality.wireframe_debug}
            isSelected={selectedItemId === item.id}
            onSelect={() => onSelectItem(item.id)}
            transformMode={transformMode}
            onTransformEnd={(pos, rot, scl) =>
              onUpdateObjectTransform(item.id, pos, rot, scl)
            }
          />
        ))}

        {/* Render All Visible 3D Characters */}
        {visibleCharacters.map((ch) => (
          <Customizable3DCharacter
            key={ch.id}
            spec={ch}
            pose={activePose}
            audioAmplitude={audioAmplitude}
            isPlaying={isPlaying}
            wireframe={quality.wireframe_debug}
            isSelected={selectedItemId === ch.id}
            onSelect={() => onSelectItem(ch.id)}
          />
        ))}

        {quality.contact_shadows && (
          <ContactShadows
            position={[0, -0.35, 0]}
            opacity={0.55}
            scale={10}
            blur={2.4}
            far={4}
          />
        )}

        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.85}
          target={activeCamera.target}
        />
      </Canvas>

      {/* Broadcast Camera & Performance Telemetry HUD Overlay */}
      <div className="pointer-events-none absolute top-20 left-6 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{activeCamera.name}</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">
            FOV {Math.round(activePose.camera_fov)}°
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">{fps} FPS</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-300">{quality.preset}</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-400">
          Objetos 3D: {visibleObjects.length} • Personagens:{" "}
          {visibleCharacters.length} • FFT Mic:{" "}
          {(audioAmplitude * 100).toFixed(0)}%
        </div>
      </div>

      {/* Broadcast Lower-Third Chyron (Positioned cleanly above floating OmniBar & Footer Timeline) */}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-[min(860px,92vw)] transition-all duration-200 ${
          timelineOpen ? "bottom-[275px]" : "bottom-32"
        }`}
      >
        <div className="rounded-xl overflow-hidden border border-white/15 shadow-2xl backdrop-blur-xl bg-slate-950/82">
          <div className="flex items-center justify-between px-4 py-1 bg-gradient-to-r from-red-600 via-rose-600 to-cyan-700 text-[10px] font-bold tracking-wider uppercase text-white">
            <span>🔴 AO VIVO • {programTitle}</span>
            <span>
              {currentAct
                ? `ATO 0${currentAct.act_number} • ${currentAct.speaker_name} (${currentAct.speaker_role})`
                : "ESTÚDIO 3D INTERATIVO"}
            </span>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 mb-0.5 truncate">
              {chyronText}
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-100 leading-snug line-clamp-2">
              {currentAct?.dialogue_text ||
                "Clique em objetos/personagens 3D no palco para movê-los ou abra o Studio Editor para importar .GLB/.OBJ/.FBX/.STL e criar novos personagens."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
