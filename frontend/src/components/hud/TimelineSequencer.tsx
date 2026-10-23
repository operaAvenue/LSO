"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Activity,
  Camera,
  Sparkles,
} from "lucide-react";
import { EpisodeManifest, ProducedAct } from "@/lib/api";

interface TimelineSequencerProps {
  manifest: EpisodeManifest | null;
  isOpen: boolean;
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
  isPlaying,
  currentTime,
  totalDuration,
  currentAct,
  onTogglePlay,
  onSeek,
  onRestart,
}: TimelineSequencerProps) {
  if (!isOpen) return null;

  const safeTotal = Math.max(1, totalDuration || manifest?.total_duration_seconds || 12);
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / safeTotal) * 100));

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 w-[min(1080px,95vw)] rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-white/15 shadow-2xl p-3.5 select-none">
      {/* Transport Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play Master
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            title="Reiniciar Timeline (00:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-cyan-300">
            {currentTime.toFixed(2)}s / {safeTotal.toFixed(2)}s
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>
            Episódio:{" "}
            <strong className="text-slate-200">
              {manifest?.episode_title || "Sem episódio carregado"}
            </strong>
          </span>
          {currentAct && (
            <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              Ato 0{currentAct.act_number} • {currentAct.dominant_emotion}
            </span>
          )}
        </div>
      </div>

      {/* Multi-Track Sequencer */}
      <div
        className="relative w-full bg-slate-900/80 rounded-xl border border-white/10 p-2.5 cursor-pointer overflow-hidden"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSeek(ratio * safeTotal);
        }}
      >
        {/* Playhead Needle */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_10px_#ef4444]"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-3 h-3 -ml-[5px] rounded-full bg-red-500 border-2 border-white" />
        </div>

        <div className="flex flex-col gap-2">
          {/* Track 1: ElevenLabs MP3 Audio Clips */}
          <div className="flex items-center gap-2">
            <div className="w-28 shrink-0 flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-400">
              <Volume2 className="w-3 h-3" /> ElevenLabs MP3
            </div>
            <div className="relative flex-1 h-7 bg-black/50 rounded-lg overflow-hidden border border-white/5">
              {manifest?.acts?.map((act) => {
                const leftPct = (act.start_time / safeTotal) * 100;
                const widthPct = (act.duration_seconds / safeTotal) * 100;
                const active = currentAct?.act_number === act.act_number;
                return (
                  <div
                    key={`audio-${act.act_number}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center justify-between text-[10px] font-mono truncate border transition ${
                      active
                        ? "bg-emerald-500/35 border-emerald-400 text-white"
                        : "bg-emerald-950/70 border-emerald-700/40 text-emerald-200"
                    }`}
                  >
                    <span className="truncate">
                      Ato {act.act_number}: {act.speaker_name}
                    </span>
                    <span className="opacity-75">{act.duration_seconds.toFixed(1)}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 2: Viktor K. IK/FK Rig Keyframes */}
          <div className="flex items-center gap-2">
            <div className="w-28 shrink-0 flex items-center gap-1 text-[10px] font-mono uppercase text-cyan-400">
              <Activity className="w-3 h-3" /> Keyframes Rig
            </div>
            <div className="relative flex-1 h-6 bg-black/50 rounded-lg overflow-hidden border border-white/5">
              {manifest?.acts?.map((act) => {
                const leftPct = (act.start_time / safeTotal) * 100;
                const widthPct = (act.duration_seconds / safeTotal) * 100;
                return (
                  <div
                    key={`rig-${act.act_number}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className="absolute top-0.5 bottom-0.5 rounded-md px-2 bg-cyan-950/70 border border-cyan-500/35 flex items-center justify-between text-[9px] font-mono text-cyan-200 truncate"
                  >
                    <span>
                      Yaw:{act.rig_keyframe.head_yaw}° Lean:{act.rig_keyframe.torso_lean}°
                    </span>
                    <span>{act.rig_keyframe.interpolation}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track 3: Camera FOV & Higgsfield Shot */}
          <div className="flex items-center gap-2">
            <div className="w-28 shrink-0 flex items-center gap-1 text-[10px] font-mono uppercase text-fuchsia-400">
              <Camera className="w-3 h-3" /> Câmera & Lente
            </div>
            <div className="relative flex-1 h-6 bg-black/50 rounded-lg overflow-hidden border border-white/5">
              {manifest?.acts?.map((act) => {
                const leftPct = (act.start_time / safeTotal) * 100;
                const widthPct = (act.duration_seconds / safeTotal) * 100;
                return (
                  <div
                    key={`cam-${act.act_number}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className="absolute top-0.5 bottom-0.5 rounded-md px-2 bg-fuchsia-950/70 border border-fuchsia-500/35 flex items-center justify-between text-[9px] font-mono text-fuchsia-200 truncate"
                  >
                    <span className="truncate">{act.camera_shot_label}</span>
                    <span>FOV {act.rig_keyframe.camera_fov}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
