"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { EpisodeManifest, ProducedAct } from "@/lib/api";

interface TimelineSequencerProps {
  manifest: EpisodeManifest | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  currentAct: ProducedAct | null;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRestart: () => void;
}

export default function TimelineSequencer({
  manifest,
  isOpen,
  onToggleOpen,
  isPlaying,
  currentTime,
  totalDuration,
  currentAct,
  onTogglePlay,
  onSeek,
  onRestart,
}: TimelineSequencerProps) {
  const safeTotal = Math.max(
    1,
    totalDuration || manifest?.total_duration_seconds || 12
  );
  const playheadPercent = Math.min(
    100,
    Math.max(0, (currentTime / safeTotal) * 100)
  );

  // Generate ruler tick marks across 100% horizontal width
  const tickCount = 20;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    ((safeTotal / tickCount) * i).toFixed(1)
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 w-screen z-30 bg-slate-950/92 backdrop-blur-2xl border-t border-white/15 shadow-[0_-16px_50px_rgba(0,0,0,0.85)] select-none transition-all duration-200">
      {/* Top Transport & Timecode Bar (Always visible at bottom footer, 100% width) */}
      <div className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> PAUSAR MASTER
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> PLAY MASTER
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
            title="Reiniciar Timeline (00:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 font-mono text-xs text-cyan-300">
            TC {currentTime.toFixed(2)}s / {safeTotal.toFixed(2)}s
          </div>

          {currentAct && (
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-mono">
              ATO 0{currentAct.act_number} • {currentAct.speaker_name} •{" "}
              {currentAct.dominant_emotion}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="hidden md:inline">
            EPISÓDIO:{" "}
            <strong className="text-slate-200">
              {manifest?.episode_title || "ESTÚDIO PRONTO"}
            </strong>
          </span>

          <button
            type="button"
            onClick={onToggleOpen}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isOpen ? "Recolher Pistas" : "Expandir Pistas"}</span>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Full-Width Left-to-Right Multi-Track Sequencer Body */}
      {isOpen && (
        <div className="w-full px-4 py-2.5 flex flex-col gap-1.5">
          {/* Timecode Ruler */}
          <div className="flex items-center w-full pl-36 pr-2 text-[9px] font-mono text-slate-500 justify-between">
            {ticks.map((t, idx) => (
              <span key={idx}>{t}s</span>
            ))}
          </div>

          {/* Interactive Scrubbing Area */}
          <div className="flex items-stretch w-full gap-2">
            {/* Track Headers Column (Left) */}
            <div className="w-36 shrink-0 flex flex-col justify-between py-1 gap-1.5 pr-2 border-r border-white/10">
              <div className="h-7 flex items-center gap-1.5 text-[10px] font-mono uppercase text-emerald-400">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Áudio ElevenLabs</span>
              </div>
              <div className="h-6 flex items-center gap-1.5 text-[10px] font-mono uppercase text-cyan-400">
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Rig IK/FK Keyframes</span>
              </div>
              <div className="h-6 flex items-center gap-1.5 text-[10px] font-mono uppercase text-fuchsia-400">
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Câmeras & Lentes</span>
              </div>
            </div>

            {/* 100% Horizontal Tracks Canvas (Left-to-Right) */}
            <div
              className="relative flex-1 bg-slate-900/90 rounded-xl border border-white/10 p-1.5 cursor-pointer overflow-hidden flex flex-col gap-1.5"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width)
                );
                onSeek(ratio * safeTotal);
              }}
            >
              {/* Playhead Needle */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_12px_#ef4444]"
                style={{ left: `${playheadPercent}%` }}
              >
                <div className="w-3 h-3 -ml-[5px] rounded-full bg-red-500 border-2 border-white" />
              </div>

              {/* Track 1: ElevenLabs MP3 Audio Clips */}
              <div className="relative w-full h-7 bg-black/55 rounded-lg overflow-hidden border border-white/5">
                {manifest?.acts?.map((act) => {
                  const leftPct = (act.start_time / safeTotal) * 100;
                  const widthPct = (act.duration_seconds / safeTotal) * 100;
                  const active = currentAct?.act_number === act.act_number;
                  return (
                    <div
                      key={`audio-${act.act_number}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-0.5 bottom-0.5 rounded-md px-2.5 flex items-center justify-between text-[10px] font-mono truncate border transition ${
                        active
                          ? "bg-emerald-500/35 border-emerald-400 text-white shadow-inner"
                          : "bg-emerald-950/70 border-emerald-700/40 text-emerald-200"
                      }`}
                    >
                      <span className="truncate">
                        Ato 0{act.act_number}: {act.speaker_name} — &ldquo;
                        {act.dialogue_text.slice(0, 38)}...&rdquo;
                      </span>
                      <span className="opacity-80 ml-2 shrink-0">
                        {act.duration_seconds.toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Track 2: Viktor K. IK/FK Rig Keyframes */}
              <div className="relative w-full h-6 bg-black/55 rounded-lg overflow-hidden border border-white/5">
                {manifest?.acts?.map((act) => {
                  const leftPct = (act.start_time / safeTotal) * 100;
                  const widthPct = (act.duration_seconds / safeTotal) * 100;
                  return (
                    <div
                      key={`rig-${act.act_number}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className="absolute top-0.5 bottom-0.5 rounded-md px-2.5 bg-cyan-950/75 border border-cyan-500/35 flex items-center justify-between text-[9px] font-mono text-cyan-200 truncate"
                    >
                      <span className="truncate">
                        Pitch:{act.rig_keyframe.head_pitch}° Yaw:
                        {act.rig_keyframe.head_yaw}° Lean:
                        {act.rig_keyframe.torso_lean}° Jaw:
                        {Math.round(act.rig_keyframe.jaw_open * 100)}%
                      </span>
                      <span className="ml-2 shrink-0">
                        {act.rig_keyframe.interpolation}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Track 3: Camera FOV & Higgsfield Shot */}
              <div className="relative w-full h-6 bg-black/55 rounded-lg overflow-hidden border border-white/5">
                {manifest?.acts?.map((act) => {
                  const leftPct = (act.start_time / safeTotal) * 100;
                  const widthPct = (act.duration_seconds / safeTotal) * 100;
                  return (
                    <div
                      key={`cam-${act.act_number}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className="absolute top-0.5 bottom-0.5 rounded-md px-2.5 bg-fuchsia-950/75 border border-fuchsia-500/35 flex items-center justify-between text-[9px] font-mono text-fuchsia-200 truncate"
                    >
                      <span className="truncate">
                        🎥 {act.camera_shot_label} ({act.lighting_preset})
                      </span>
                      <span className="ml-2 shrink-0">
                        FOV {act.rig_keyframe.camera_fov}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
