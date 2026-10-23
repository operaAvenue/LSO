"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CharacterSpec,
  EmotionType,
  ProducedAct,
  RigKeyframe,
  SceneObjectItem,
  StudioLayer,
  StudioLightConfig,
  resolveBackendAssetUrl,
} from "@/lib/api";

interface StageSouthParkProps {
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
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

const EMOTION_BADGE: Record<EmotionType, { bg: string; label: string }> = {
  SHOCK: { bg: "#06b6d4", label: "CHOQUE TOTAL" },
  OUTRAGE: { bg: "#ef4444", label: "INDIGNAÇÃO" },
  SARCASM: { bg: "#a855f7", label: "SARCASMO ÁCIDO" },
  ANALYTICAL: { bg: "#3b82f6", label: "FRIEZA ANALÍTICA" },
  HYSTERICAL: { bg: "#eab308", label: "HISTERIA AO VIVO" },
};

export default function StageSouthPark({
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
  selectedItemId,
  onSelectItem,
}: StageSouthParkProps) {
  // 12fps Stepped Interpolation Clock (every 83.3ms)
  const [steppedPose, setSteppedPose] = useState<RigKeyframe>(activePose);
  const [steppedAmp, setSteppedAmp] = useState<number>(0);
  const [stepTick, setStepTick] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSteppedPose(activePose);
      setSteppedAmp(audioAmplitude);
      setStepTick((prev) => (prev + 1) % 12);
    }, 1000 / 12);
    return () => clearInterval(interval);
  }, [activePose, audioAmplitude]);

  const emotion: EmotionType = currentAct?.dominant_emotion || "SARCASM";
  const badge = EMOTION_BADGE[emotion] || EMOTION_BADGE.SARCASM;

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.visible).map((l) => l.id)),
    [layers]
  );

  const visibleCharacters = useMemo(
    () =>
      characters.filter(
        (c) =>
          c.visible &&
          (c.mode === "2D_SOUTHPARK" || c.mode === "BOTH") &&
          visibleLayerIds.has(c.layer_id)
      ),
    [characters, visibleLayerIds]
  );

  const visible2DSprites = useMemo(
    () =>
      sceneObjects.filter(
        (o) =>
          o.visible &&
          o.kind === "sprite_2d" &&
          o.asset_url &&
          visibleLayerIds.has(o.layer_id)
      ),
    [sceneObjects, visibleLayerIds]
  );

  const rawMouthEnergy = isPlaying
    ? Math.min(1.0, steppedAmp * 1.55 + steppedPose.jaw_open * 0.25)
    : steppedPose.jaw_open;
  const quantizedGap = Math.round(rawMouthEnergy * 5) / 5;
  const zoomScale = Math.max(
    0.78,
    Math.min(1.32, 42 / (steppedPose.camera_fov || 42))
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center"
      style={{
        background: `linear-gradient(to bottom, ${lighting.background_top}, ${lighting.background_bottom})`,
      }}
      onClick={() => onSelectItem(null)}
    >
      {/* Cutout Studio Stage Backdrop */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center"
        style={{
          transform: `scale(${zoomScale.toFixed(3)})`,
          transition: "transform 83ms steps(1, end)",
        }}
      >
        {/* Construction Paper Mountains & Cardboard Newsroom Background */}
        <div
          className="absolute bottom-[28%] left-[-10%] w-[65%] h-[42%] bg-[#3b5249] rotate-[-4deg] shadow-[0_8px_0_rgba(0,0,0,0.35)]"
          style={{
            clipPath:
              "polygon(0% 100%, 28% 12%, 58% 68%, 82% 20%, 100% 100%)",
          }}
        />
        <div
          className="absolute bottom-[28%] right-[-10%] w-[70%] h-[46%] bg-[#2f423b] rotate-[3deg] shadow-[0_8px_0_rgba(0,0,0,0.35)]"
          style={{
            clipPath: "polygon(0% 100%, 22% 24%, 49% 72%, 76% 8%, 100% 100%)",
          }}
        />

        {/* Custom Imported 2D Sprites / Cutout Props */}
        {visible2DSprites.map((sp) => (
          <img
            key={sp.id}
            src={resolveBackendAssetUrl(sp.asset_url)}
            alt={sp.name}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(sp.id);
            }}
            style={{
              transform: `translate(${sp.position[0] * 120}px, ${
                -sp.position[1] * 120
              }px) rotate(${sp.rotation[2]}deg) scale(${sp.scale[0]})`,
            }}
            className={`absolute z-10 max-h-56 object-contain cursor-pointer transition-none ${
              selectedItemId === sp.id ? "ring-4 ring-cyan-400 rounded-xl" : ""
            }`}
          />
        ))}

        {/* Studio "CHOQUE DE CORTIÇA" Cardboard Banner */}
        <div className="absolute top-20 px-6 py-2 bg-[#f59e0b] text-slate-950 font-black tracking-widest uppercase text-xs md:text-sm rotate-[-1.5deg] border-4 border-slate-950 shadow-[6px_6px_0px_#020617]">
          ✂️ PAPER-CUTOUT 12FPS • {programTitle} ({visibleCharacters.length}{" "}
          PERSONAGENS)
        </div>

        {/* Multi-Character Paper-Cutout Lineup */}
        <div className="relative z-20 flex items-end justify-center gap-10 mt-6">
          {visibleCharacters.map((char, idx) => {
            const isSpeaker = char.is_active_speaker;
            const charGap = isSpeaker ? quantizedGap : quantizedGap * 0.12;
            const headLiftPx = charGap * 46;
            const headFlapTilt =
              (stepTick % 2 === 0 ? 1 : -1) * charGap * 11 +
              steppedPose.head_yaw * (isSpeaker ? 0.22 : 0.05);
            const bodyWobbleDeg =
              steppedPose.torso_lean * (isSpeaker ? 0.45 : 0.1) +
              (isPlaying && charGap > 0.2
                ? stepTick % 2 === 0
                  ? 2.5
                  : -2.5
                : 0);
            const isSelected = selectedItemId === char.id;

            return (
              <div
                key={char.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!char.locked) onSelectItem(char.id);
                }}
                style={{
                  transform: `translate(${char.position[0] * 45}px, ${
                    -char.position[1] * 20
                  }px) scale(${char.scale}) rotate(${bodyWobbleDeg.toFixed(
                    1
                  )}deg)`,
                }}
                className={`relative flex flex-col items-center cursor-pointer ${
                  isSelected
                    ? "ring-4 ring-cyan-400 rounded-3xl p-2 bg-cyan-500/10"
                    : ""
                }`}
              >
                {/* Character Name Tag */}
                <div className="mb-2 px-2.5 py-0.5 rounded bg-slate-950/90 border-2 border-slate-950 text-[10px] font-mono font-bold text-amber-300 shadow">
                  {char.name} ({char.role})
                </div>

                {/* Split-Head Container */}
                <div className="relative w-44 h-44 flex flex-col items-center justify-end">
                  {/* Dark Mouth Interior Behind Split Head */}
                  <div
                    className="absolute bottom-7 w-32 bg-[#1a0508] border-4 border-slate-950 rounded-xl flex items-end justify-center overflow-hidden"
                    style={{
                      height: `${Math.max(12, headLiftPx + 16)}px`,
                    }}
                  >
                    <div className="w-14 h-4 bg-[#f43f5e] rounded-t-full border-t-2 border-slate-950" />
                  </div>

                  {/* UPPER HINGED CRANIUM */}
                  <div
                    className="relative z-20 w-40 h-24 rounded-t-[70px] border-4 border-slate-950 shadow-[5px_5px_0px_rgba(0,0,0,0.45)] flex flex-col items-center justify-end pb-1.5 overflow-visible"
                    style={{
                      backgroundColor: char.skin_color,
                      transform: `translateY(${-headLiftPx}px) rotate(${headFlapTilt.toFixed(
                        1
                      )}deg)`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    {char.custom_2d_head_url ? (
                      <img
                        src={resolveBackendAssetUrl(char.custom_2d_head_url)}
                        alt={char.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <>
                        {/* Hat / Hair Cutout */}
                        {char.hat_style !== "none" ? (
                          <div
                            className="absolute -top-5 w-44 h-11 rounded-t-full border-4 border-slate-950 flex items-center justify-center"
                            style={{ backgroundColor: char.hat_color }}
                          >
                            <div className="w-32 h-2.5 bg-[#facc15] border-2 border-slate-950" />
                          </div>
                        ) : (
                          char.hair_style !== "bald" && (
                            <div
                              className="absolute -top-4 w-42 h-9 rounded-t-3xl border-4 border-slate-950"
                              style={{ backgroundColor: char.hair_color }}
                            />
                          )
                        )}

                        {/* Paper Eyebrows */}
                        <div className="flex items-center justify-center gap-5 mb-0.5 z-30">
                          <div
                            className="w-9 h-2 bg-slate-950"
                            style={{
                              transform: `translateY(${
                                -steppedPose.brow_raise * 5
                              }px) rotate(${-steppedPose.brow_raise * 18}deg)`,
                            }}
                          />
                          <div
                            className="w-9 h-2 bg-slate-950"
                            style={{
                              transform: `translateY(${
                                -steppedPose.brow_raise * 5
                              }px) rotate(${steppedPose.brow_raise * 18}deg)`,
                            }}
                          />
                        </div>

                        {/* Paper White Oval Eyes */}
                        <div
                          className="flex items-center justify-center gap-1"
                          style={{ transform: `scale(${char.eye_scale})` }}
                        >
                          <div
                            className={`w-11 h-12 bg-white rounded-full border-2 border-slate-950 flex items-center justify-center rotate-[6deg] ${
                              char.glasses ? "ring-4 ring-cyan-400" : ""
                            }`}
                          >
                            <div
                              className="w-2.5 h-2.5 bg-slate-950 rounded-full"
                              style={{
                                transform: `translate(${
                                  steppedPose.head_yaw * 0.12
                                }px, ${steppedPose.head_pitch * 0.1}px)`,
                              }}
                            />
                          </div>
                          <div
                            className={`w-11 h-12 bg-white rounded-full border-2 border-slate-950 flex items-center justify-center rotate-[-6deg] ${
                              char.glasses ? "ring-4 ring-cyan-400" : ""
                            }`}
                          >
                            <div
                              className="w-2.5 h-2.5 bg-slate-950 rounded-full"
                              style={{
                                transform: `translate(${
                                  steppedPose.head_yaw * 0.12
                                }px, ${steppedPose.head_pitch * 0.1}px)`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* LOWER JAW / CHIN */}
                  <div
                    className="relative z-10 w-36 h-12 rounded-b-[42px] border-4 border-slate-950 shadow-[5px_5px_0px_rgba(0,0,0,0.45)]"
                    style={{ backgroundColor: char.skin_color }}
                  />
                </div>

                {/* Paper-Cutout Torso & Arms */}
                <div
                  className="relative w-44 h-32 rounded-t-[32px] border-4 border-slate-950 shadow-[6px_6px_0px_rgba(0,0,0,0.5)] flex justify-center -mt-2"
                  style={{ backgroundColor: char.suit_color }}
                >
                  <div className="w-1 h-full bg-slate-950 flex flex-col items-center justify-around py-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                  </div>

                  {/* Left Arm */}
                  <div
                    className="absolute -left-8 top-3 w-10 h-24 rounded-full border-4 border-slate-950 origin-top"
                    style={{
                      backgroundColor: char.suit_color,
                      transform: `rotate(${
                        20 + steppedPose.left_arm_ik * (isSpeaker ? 95 : 30)
                      }deg)`,
                    }}
                  >
                    <div
                      className="absolute -bottom-2.5 left-0 w-8 h-8 rounded-full border-4 border-slate-950"
                      style={{ backgroundColor: char.glove_color }}
                    />
                  </div>

                  {/* Right Arm */}
                  <div
                    className="absolute -right-8 top-3 w-10 h-24 rounded-full border-4 border-slate-950 origin-top"
                    style={{
                      backgroundColor: char.suit_color,
                      transform: `rotate(${
                        -20 - steppedPose.right_arm_ik * (isSpeaker ? 95 : 30)
                      }deg)`,
                    }}
                  >
                    <div
                      className="absolute -bottom-2.5 left-0 w-8 h-8 rounded-full border-4 border-slate-950"
                      style={{ backgroundColor: char.glove_color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cardboard Broadcast Desk */}
        <div className="relative z-30 -mt-3 w-[min(640px,90vw)] h-24 bg-[#78350f] border-4 border-slate-950 shadow-[8px_8px_0px_#020617] flex flex-col items-center justify-center px-6">
          <div
            className="px-3 py-0.5 border-2 border-slate-950 text-xs font-black uppercase text-slate-950 mb-1"
            style={{ backgroundColor: badge.bg }}
          >
            {badge.label} • 12 FPS STEPPED
          </div>
          <p className="text-xs font-mono text-amber-100 text-center line-clamp-1">
            {currentAct?.retention_hook_2s || chyronText}
          </p>
        </div>
      </div>

      {/* Dialogue Bubble Overlay above Floating OmniBar */}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-[min(820px,92vw)] transition-all duration-200 ${
          timelineOpen ? "bottom-[275px]" : "bottom-32"
        }`}
      >
        <div className="bg-amber-50 text-slate-950 border-4 border-slate-950 rounded-2xl px-5 py-2.5 shadow-[8px_8px_0px_#020617]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-rose-700 mb-0.5">
            <span>
              {currentAct
                ? `${currentAct.speaker_name} (${currentAct.speaker_role})`
                : "BANCADA DE CORTIÇA 2D"}
            </span>
            <span>ABERTURA Y: {Math.round(quantizedGap * 46)}PX</span>
          </div>
          <p className="text-xs md:text-sm font-bold leading-snug line-clamp-2">
            {currentAct?.dialogue_text ||
              "Abra o Studio Editor na barra superior para criar novos personagens 2D/3D, customizar chapéus/cabelos/cores ou importar camadas PNG/SVG!"}
          </p>
        </div>
      </div>
    </div>
  );
}
