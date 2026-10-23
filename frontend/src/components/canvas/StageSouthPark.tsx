"use client";

import React, { useEffect, useState } from "react";
import { EmotionType, ProducedAct, RigKeyframe } from "@/lib/api";

interface StageSouthParkProps {
  activePose: RigKeyframe;
  audioAmplitude: number;
  currentAct?: ProducedAct | null;
  chyronText: string;
  programTitle: string;
  isPlaying: boolean;
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
}: StageSouthParkProps) {
  // 12fps Stepped Interpolation Clock (quantizes pose & mouth amplitude every 83.3ms)
  const [steppedPose, setSteppedPose] = useState<RigKeyframe>(activePose);
  const [steppedAmp, setSteppedAmp] = useState<number>(0);
  const [stepTick, setStepTick] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSteppedPose(activePose);
      setSteppedAmp(audioAmplitude);
      setStepTick((prev) => (prev + 1) % 12);
    }, 1000 / 12); // Strict 12fps paper-cutout stepped animation
    return () => clearInterval(interval);
  }, [activePose, audioAmplitude]);

  const emotion: EmotionType = currentAct?.dominant_emotion || "SARCASM";
  const badge = EMOTION_BADGE[emotion] || EMOTION_BADGE.SARCASM;

  // Compute paper-cutout hinged upper-head lift on Y axis + tilt synced to ElevenLabs MP3 amplitude
  const rawMouthEnergy = isPlaying
    ? Math.min(1.0, steppedAmp * 1.55 + steppedPose.jaw_open * 0.25)
    : steppedPose.jaw_open;
  // Quantize to 5 discrete paper-cutout steps for authentic stop-motion feel
  const quantizedGap = Math.round(rawMouthEnergy * 5) / 5;
  const headLiftPx = quantizedGap * 46;
  const headFlapTilt =
    (stepTick % 2 === 0 ? 1 : -1) * quantizedGap * 11 +
    steppedPose.head_yaw * 0.22;
  const bodyWobbleDeg =
    steppedPose.torso_lean * 0.45 +
    (isPlaying && quantizedGap > 0.2 ? (stepTick % 2 === 0 ? 2.5 : -2.5) : 0);

  const zoomScale = Math.max(0.8, Math.min(1.35, 42 / (steppedPose.camera_fov || 42)));

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#1c2438] flex items-center justify-center">
      {/* SVG Felt / Construction Paper Noise Filter */}
      <svg className="hidden">
        <filter id="paper-cutout-texture">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="4"
            result="noise"
          />
          <feDiffuseLighting in="noise" lightingColor="#ffffff" surfaceScale="1.6">
            <feDistantLight azimuth="45" elevation="62" />
          </feDiffuseLighting>
        </filter>
      </svg>

      {/* Cutout Studio Stage Backdrop */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center"
        style={{
          transform: `scale(${zoomScale.toFixed(3)})`,
          transition: "transform 83ms steps(1, end)",
        }}
      >
        {/* Construction Paper Mountains & Cardboard Newsroom Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#283655] via-[#35476e] to-[#1e293b]" />
        <div
          className="absolute bottom-[28%] left-[-10%] w-[65%] h-[42%] bg-[#3b5249] rotate-[-4deg] shadow-[0_8px_0_rgba(0,0,0,0.35)]"
          style={{ clipPath: "polygon(0% 100%, 28% 12%, 58% 68%, 82% 20%, 100% 100%)" }}
        />
        <div
          className="absolute bottom-[28%] right-[-10%] w-[70%] h-[46%] bg-[#2f423b] rotate-[3deg] shadow-[0_8px_0_rgba(0,0,0,0.35)]"
          style={{ clipPath: "polygon(0% 100%, 22% 24%, 49% 72%, 76% 8%, 100% 100%)" }}
        />

        {/* Studio "CHOQUE DE CORTIÇA" Cardboard Banner */}
        <div className="absolute top-24 px-6 py-2 bg-[#f59e0b] text-slate-950 font-black tracking-widest uppercase text-sm rotate-[-1.5deg] border-4 border-slate-950 shadow-[6px_6px_0px_#020617]">
          ✂️ PAPER-CUTOUT 12FPS • {programTitle}
        </div>

        {/* Paper-Cutout Character Rig */}
        <div
          className="relative z-10 flex flex-col items-center mt-8"
          style={{
            transform: `rotate(${bodyWobbleDeg.toFixed(1)}deg)`,
          }}
        >
          {/* Canadian / South Park Style Split-Head Container */}
          <div className="relative w-52 h-52 flex flex-col items-center justify-end">
            {/* Dark Mouth Interior Behind Split Head */}
            <div
              className="absolute bottom-8 w-36 bg-[#1a0508] border-4 border-slate-950 rounded-xl flex items-end justify-center overflow-hidden"
              style={{
                height: `${Math.max(12, headLiftPx + 18)}px`,
              }}
            >
              {/* Paper Tongue */}
              <div className="w-16 h-5 bg-[#f43f5e] rounded-t-full border-t-2 border-slate-950" />
            </div>

            {/* UPPER HINGED CRANIUM (lifts on Y axis and tilts with ElevenLabs MP3 amplitude) */}
            <div
              className="relative z-20 w-44 h-28 bg-[#fde68a] rounded-t-[76px] border-4 border-slate-950 shadow-[5px_5px_0px_rgba(0,0,0,0.45)] flex flex-col items-center justify-end pb-2"
              style={{
                transform: `translateY(${-headLiftPx}px) rotate(${headFlapTilt.toFixed(1)}deg)`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Cutout Hair / Hat */}
              <div className="absolute -top-5 w-48 h-12 bg-[#0ea5e9] rounded-t-full border-4 border-slate-950 flex items-center justify-center">
                <div className="w-36 h-3 bg-[#facc15] border-2 border-slate-950" />
              </div>

              {/* Paper Cutout Eyebrows (brow_raise) */}
              <div className="flex items-center justify-center gap-6 mb-0.5 z-30">
                <div
                  className="w-10 h-2.5 bg-slate-950"
                  style={{
                    transform: `translateY(${-steppedPose.brow_raise * 6}px) rotate(${
                      -steppedPose.brow_raise * 18
                    }deg)`,
                  }}
                />
                <div
                  className="w-10 h-2.5 bg-slate-950"
                  style={{
                    transform: `translateY(${-steppedPose.brow_raise * 6}px) rotate(${
                      steppedPose.brow_raise * 18
                    }deg)`,
                  }}
                />
              </div>

              {/* Paper Cutout White Oval Eyes */}
              <div className="flex items-center justify-center gap-1">
                <div className="w-12 h-14 bg-white rounded-full border-2 border-slate-950 flex items-center justify-center rotate-[6deg]">
                  <div
                    className="w-3 h-3 bg-slate-950 rounded-full"
                    style={{
                      transform: `translate(${steppedPose.head_yaw * 0.12}px, ${
                        steppedPose.head_pitch * 0.1
                      }px)`,
                    }}
                  />
                </div>
                <div className="w-12 h-14 bg-white rounded-full border-2 border-slate-950 flex items-center justify-center rotate-[-6deg]">
                  <div
                    className="w-3 h-3 bg-slate-950 rounded-full"
                    style={{
                      transform: `translate(${steppedPose.head_yaw * 0.12}px, ${
                        steppedPose.head_pitch * 0.1
                      }px)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* LOWER JAW / CHIN (Fixed to Neck) */}
            <div className="relative z-10 w-40 h-14 bg-[#fde68a] rounded-b-[48px] border-4 border-slate-950 shadow-[5px_5px_0px_rgba(0,0,0,0.45)]" />
          </div>

          {/* Paper-Cutout Torso & Arms */}
          <div className="relative w-52 h-36 bg-[#dc2626] rounded-t-[36px] border-4 border-slate-950 shadow-[6px_6px_0px_rgba(0,0,0,0.5)] flex justify-center -mt-2">
            {/* Center Coat Line & Buttons */}
            <div className="w-1 h-full bg-slate-950 flex flex-col items-center justify-around py-4">
              <div className="w-3 h-3 rounded-full bg-slate-950" />
              <div className="w-3 h-3 rounded-full bg-slate-950" />
              <div className="w-3 h-3 rounded-full bg-slate-950" />
            </div>

            {/* Left Paper Arm (left_arm_ik) */}
            <div
              className="absolute -left-10 top-3 w-12 h-28 bg-[#dc2626] rounded-full border-4 border-slate-950 origin-top"
              style={{
                transform: `rotate(${20 + steppedPose.left_arm_ik * 95}deg)`,
              }}
            >
              <div className="absolute -bottom-3 left-0.5 w-9 h-9 rounded-full bg-[#16a34a] border-4 border-slate-950" />
            </div>

            {/* Right Paper Arm (right_arm_ik) */}
            <div
              className="absolute -right-10 top-3 w-12 h-28 bg-[#dc2626] rounded-full border-4 border-slate-950 origin-top"
              style={{
                transform: `rotate(${-20 - steppedPose.right_arm_ik * 95}deg)`,
              }}
            >
              <div className="absolute -bottom-3 left-0.5 w-9 h-9 rounded-full bg-[#16a34a] border-4 border-slate-950" />
            </div>
          </div>

          {/* Cardboard Broadcast Desk */}
          <div className="relative z-30 -mt-4 w-[480px] max-w-[90vw] h-28 bg-[#78350f] border-4 border-slate-950 shadow-[8px_8px_0px_#020617] flex flex-col items-center justify-center px-6">
            <div
              className="px-3 py-0.5 border-2 border-slate-950 text-xs font-black uppercase text-slate-950 mb-1"
              style={{ backgroundColor: badge.bg }}
            >
              {badge.label} • 12 FPS STEPPED
            </div>
            <p className="text-xs font-mono text-amber-100 text-center line-clamp-2">
              {currentAct?.retention_hook_2s || chyronText}
            </p>
          </div>
        </div>
      </div>

      {/* Dialogue Bubble Overlay */}
      <div className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 w-[min(820px,90vw)]">
        <div className="bg-amber-50 text-slate-950 border-4 border-slate-950 rounded-2xl px-5 py-3 shadow-[8px_8px_0px_#020617]">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-rose-700 mb-1">
            <span>
              {currentAct
                ? `${currentAct.speaker_name} (${currentAct.speaker_role})`
                : "BANCADA DE CORTIÇA"}
            </span>
            <span>ABERTURA Y: {Math.round(headLiftPx)}PX</span>
          </div>
          <p className="text-sm md:text-base font-bold leading-snug">
            {currentAct?.dialogue_text ||
              "Envie uma pauta na Gemini OmniBar para ver o boneco South Park abrir a cabeça no eixo Y sincronizado com o MP3!"}
          </p>
        </div>
      </div>
    </div>
  );
}
