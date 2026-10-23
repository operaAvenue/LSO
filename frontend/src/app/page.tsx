"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Stage3D from "@/components/canvas/Stage3D";
import StageSouthPark from "@/components/canvas/StageSouthPark";
import NodeGraph from "@/components/canvas/NodeGraph";
import TopStitchPill, {
  ActiveDrawerType,
  RenderStageMode,
  WorkspaceLayoutMode,
} from "@/components/hud/TopStitchPill";
import GeminiOmniBar from "@/components/hud/GeminiOmniBar";
import TimelineSequencer from "@/components/hud/TimelineSequencer";
import FloatingDrawers from "@/components/hud/FloatingDrawers";
import {
  ApiVaultState,
  EpisodeManifest,
  LLMProvider,
  ProducedAct,
  RigKeyframe,
  TVProgramType,
  bakeRigKeyframe,
  dispatchHiggsfield,
  fetchEpisodes,
  fetchHealth,
  produceEpisode,
  rerunAgentNode,
  resolveBackendAssetUrl,
} from "@/lib/api";
import { Maximize2, Minimize2, Video } from "lucide-react";

const DEFAULT_POSE: RigKeyframe = {
  head_pitch: -4,
  head_yaw: 8,
  torso_lean: 6,
  left_arm_ik: 0.35,
  right_arm_ik: 0.45,
  jaw_open: 0.18,
  brow_raise: 0.25,
  camera_fov: 40,
  interpolation: "CUBIC_BEZIER",
};

export default function AITVStudioWorkspace() {
  // Spatial Workspace States
  const [selectedProgram, setSelectedProgram] = useState<TVProgramType>("Plantão Neural 24h");
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("squad_mode");
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>("STAGE");
  const [renderStageMode, setRenderStageMode] = useState<RenderStageMode>("3D");
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerType>(null);
  const [timelineOpen, setTimelineOpen] = useState<boolean>(true);

  // Episode & Production States
  const [manifest, setManifest] = useState<EpisodeManifest | null>(null);
  const [isProducing, setIsProducing] = useState<boolean>(false);
  const [isRerunning, setIsRerunning] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("marcus");
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>({});
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // API Vault State (persisted in localStorage)
  const [vault, setVault] = useState<ApiVaultState>({
    gemini: "",
    openai: "",
    anthropic: "",
    xai: "",
    elevenlabs: "",
    higgsfield: "",
    voiceId: "pNInz6obpgDQGcFmaJgB",
  });

  // Playback, Real Audio Element + Web Audio API AnalyserNode & PiP Video Sync
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [audioAmplitude, setAudioAmplitude] = useState<number>(0);
  const [livePose, setLivePose] = useState<RigKeyframe>(DEFAULT_POSE);
  const [pipLarge, setPipLarge] = useState<boolean>(false);
  const [localPreviewVideoUrl, setLocalPreviewVideoUrl] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeCreatedRef = useRef<boolean>(false);
  const activeAudioSrcRef = useRef<string>("");
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Stage MediaRecorder state
  const [isRecordingStage, setIsRecordingStage] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Load saved Vault keys from localStorage on mount & fetch health + latest episode
  useEffect(() => {
    try {
      const raw = localStorage.getItem("aitv_vault_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        setVault((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const syncHealth = useCallback(async (currentVault: ApiVaultState) => {
    try {
      const data = await fetchHealth(currentVault);
      if (data.providers) setProviderStatus(data.providers);
      if (data.default_prompts) setDefaultPrompts(data.default_prompts);
    } catch {
      // backend might still be starting
    }
  }, []);

  useEffect(() => {
    syncHealth(vault);
    fetchEpisodes()
      .then((list) => {
        if (list.length > 0) {
          const latest = list[0];
          setManifest(latest);
          setSelectedProgram(latest.selected_program);
          setRenderStageMode(
            latest.visual_mode_recommendation === "2D_SOUTHPARK" ? "2D_SOUTHPARK" : "3D"
          );
          if (latest.acts?.[0]?.rig_keyframe) {
            setLivePose(latest.acts[0].rig_keyframe);
          }
        }
      })
      .catch(() => {});
  }, [syncHealth, vault]);

  // Determine current Act based on timeline playhead
  const currentAct: ProducedAct | null = useMemo(() => {
    if (!manifest?.acts?.length) return null;
    const found = manifest.acts.find(
      (a) => currentTime >= a.start_time && currentTime <= a.end_time + 0.05
    );
    return found || manifest.acts[manifest.acts.length - 1];
  }, [manifest, currentTime]);

  // Update livePose when crossing into a new Act
  useEffect(() => {
    if (currentAct?.rig_keyframe) {
      setLivePose(currentAct.rig_keyframe);
    }
  }, [currentAct?.act_number]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Web Audio API AnalyserNode connected to the real HTMLAudioElement
  const ensureAudioAnalyser = useCallback(() => {
    if (!audioElRef.current) return;
    if (!audioCtxRef.current) {
      const AudioContextCls =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextCls();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;

      if (!sourceNodeCreatedRef.current) {
        const src = ctx.createMediaElementSource(audioElRef.current);
        src.connect(analyser);
        analyser.connect(ctx.destination);
        sourceNodeCreatedRef.current = true;
      }
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  // Master playback loop: synchronizes Timeline Playhead, ElevenLabs MP3 HTMLAudioElement, AnalyserNode FFT, and PiP Video
  useEffect(() => {
    if (!isPlaying || !manifest) {
      setAudioAmplitude(0);
      if (audioElRef.current && !audioElRef.current.paused) {
        audioElRef.current.pause();
      }
      if (pipVideoRef.current && !pipVideoRef.current.paused) {
        pipVideoRef.current.pause();
      }
      return;
    }

    ensureAudioAnalyser();
    let rafId = 0;
    let lastTick = performance.now();
    const freqBins = new Uint8Array(128);

    const step = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      setCurrentTime((prev) => {
        const nextTime = prev + dt;
        const total = manifest.total_duration_seconds || 12;
        if (nextTime >= total) {
          setIsPlaying(false);
          return 0;
        }
        return nextTime;
      });

      // Read real-time frequency energy from ElevenLabs MP3 via AnalyserNode
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqBins);
        let sum = 0;
        // Focus on vocal fundamental & formant bands (bins 2..48)
        for (let i = 2; i < 48; i++) {
          sum += freqBins[i];
        }
        const avg = sum / (46 * 255);
        setAudioAmplitude(Math.min(1, avg * 2.2));
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, manifest, ensureAudioAnalyser]);

  // Keep HTMLAudioElement playing the current Act's physical MP3 file in sync with currentTime
  useEffect(() => {
    const audioEl = audioElRef.current;
    if (!audioEl || !currentAct?.audio_url) return;

    const fullAudioUrl = resolveBackendAssetUrl(currentAct.audio_url);
    const offsetWithinAct = Math.max(0, currentTime - currentAct.start_time);

    if (activeAudioSrcRef.current !== fullAudioUrl) {
      activeAudioSrcRef.current = fullAudioUrl;
      audioEl.src = fullAudioUrl;
      audioEl.currentTime = offsetWithinAct;
      if (isPlaying) {
        audioEl.play().catch(() => {});
      }
    } else if (isPlaying && audioEl.paused && offsetWithinAct < currentAct.duration_seconds - 0.15) {
      audioEl.currentTime = offsetWithinAct;
      audioEl.play().catch(() => {});
    }
  }, [currentAct, currentTime, isPlaying]);

  // Keep PiP Input Video synchronized with timeline playhead
  useEffect(() => {
    const vid = pipVideoRef.current;
    if (!vid) return;
    if (Math.abs(vid.currentTime - currentTime) > 0.45) {
      vid.currentTime = currentTime % Math.max(1, vid.duration || 30);
    }
    if (isPlaying && vid.paused) {
      vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [currentTime, isPlaying]);

  const handleSeek = (targetSeconds: number) => {
    setCurrentTime(targetSeconds);
    if (audioElRef.current && manifest?.acts?.length) {
      const targetAct =
        manifest.acts.find(
          (a) => targetSeconds >= a.start_time && targetSeconds <= a.end_time
        ) || manifest.acts[0];
      if (targetAct?.audio_url) {
        const fullUrl = resolveBackendAssetUrl(targetAct.audio_url);
        if (activeAudioSrcRef.current !== fullUrl) {
          activeAudioSrcRef.current = fullUrl;
          audioElRef.current.src = fullUrl;
        }
        audioElRef.current.currentTime = Math.max(0, targetSeconds - targetAct.start_time);
      }
    }
  };

  const handleProduce = async (prompt: string, mediaFile: File | null) => {
    setIsProducing(true);
    setErrorBanner(null);
    setIsPlaying(false);
    try {
      if (mediaFile && mediaFile.type.startsWith("video/")) {
        setLocalPreviewVideoUrl(URL.createObjectURL(mediaFile));
      }
      const created = await produceEpisode({
        prompt,
        llmProvider,
        preferredProgram: selectedProgram,
        mediaFile,
        vault,
      });
      setManifest(created);
      setSelectedProgram(created.selected_program);
      setRenderStageMode(
        created.visual_mode_recommendation === "2D_SOUTHPARK" ? "2D_SOUTHPARK" : "3D"
      );
      setCurrentTime(0);
      if (created.acts?.[0]?.rig_keyframe) {
        setLivePose(created.acts[0].rig_keyframe);
      }
      activeAudioSrcRef.current = "";
      setIsPlaying(true);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Erro ao produzir episódio"
      );
    } finally {
      setIsProducing(false);
    }
  };

  const handleRerunNode = async (agentId: string, customPrompt: string) => {
    if (!manifest) return;
    setIsRerunning(true);
    setIsPlaying(false);
    try {
      const updated = await rerunAgentNode({
        episodeId: manifest.episode_id,
        agentId,
        customPrompt,
        llmProvider,
        vault,
      });
      setManifest(updated);
      setCurrentTime(0);
      activeAudioSrcRef.current = "";
      setIsPlaying(true);
    } finally {
      setIsRerunning(false);
    }
  };

  const handleBakeKeyframe = async () => {
    if (!manifest) return;
    const actNum = currentAct?.act_number || 1;
    const updated = await bakeRigKeyframe({
      episodeId: manifest.episode_id,
      actNumber: actNum,
      rigKeyframe: livePose,
    });
    setManifest(updated);
  };

  const handleToggleDrawer = (drawer: Exclude<ActiveDrawerType, null>) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const handleToggleRecordStage = () => {
    if (isRecordingStage && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingStage(false);
      return;
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      setErrorBanner("Mude para o Modo Palco 3D para gravar o canvas via MediaRecorder.");
      return;
    }
    const stream = canvas.captureStream(30);
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${manifest?.episode_id || "aitv_stage"}.webm`;
      a.click();
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecordingStage(true);
  };

  const pipVideoSrc =
    localPreviewVideoUrl ||
    (manifest?.input_media_url &&
    /\.(mp4|webm)$/i.test(manifest.input_media_url)
      ? resolveBackendAssetUrl(manifest.input_media_url)
      : null);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#04060c]">
      {/* Hidden Real HTMLAudioElement with CORS enabled for Web Audio API AnalyserNode */}
      <audio ref={audioElRef} crossOrigin="anonymous" className="hidden" />

      {/* Top Floating Stitch Pill */}
      <TopStitchPill
        selectedProgram={selectedProgram}
        onSelectProgram={setSelectedProgram}
        llmProvider={llmProvider}
        onSelectLlm={setLlmProvider}
        layoutMode={layoutMode}
        onSelectLayoutMode={setLayoutMode}
        renderStageMode={renderStageMode}
        onSelectRenderStageMode={setRenderStageMode}
        activeDrawer={activeDrawer}
        onToggleDrawer={handleToggleDrawer}
        providerStatus={providerStatus}
      />

      {/* Error Toast if any */}
      {errorBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-red-950/90 border border-red-500/50 text-xs text-red-200 shadow-2xl flex items-center gap-3">
          <span>⚠️ {errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 100vw x 100vh Unobstructed Spatial Canvas (Stage / Split 50-50 / Node Graph) */}
      <div className="w-full h-full flex">
        {(layoutMode === "STAGE" || layoutMode === "SPLIT") && (
          <div
            className={`h-full relative ${
              layoutMode === "SPLIT" ? "w-1/2 border-r border-white/10" : "w-full"
            }`}
          >
            {renderStageMode === "3D" ? (
              <Stage3D
                activePose={livePose}
                audioAmplitude={audioAmplitude}
                currentAct={currentAct}
                chyronText={
                  manifest?.breaking_chyron ||
                  "PLANTÃO NEURAL 24H • ORQUESTRADOR MULTI-AGENTE PRONTO"
                }
                programTitle={manifest?.selected_program || selectedProgram}
                isPlaying={isPlaying}
              />
            ) : (
              <StageSouthPark
                activePose={livePose}
                audioAmplitude={audioAmplitude}
                currentAct={currentAct}
                chyronText={
                  manifest?.breaking_chyron ||
                  "CHOQUE DE CORTIÇA • 12FPS PAPER-CUTOUT ENGINE"
                }
                programTitle={manifest?.selected_program || selectedProgram}
                isPlaying={isPlaying}
              />
            )}
          </div>
        )}

        {(layoutMode === "GRAPH" || layoutMode === "SPLIT") && (
          <div className={layoutMode === "SPLIT" ? "w-1/2 h-full" : "w-full h-full"}>
            <NodeGraph
              manifest={manifest}
              onSelectAgentNode={(agentId) => {
                if (agentId !== "ingest") {
                  setSelectedAgentId(agentId);
                  setActiveDrawer("INSPECTOR");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Resizable Picture-in-Picture (PiP) Input Video Monitor synchronized with Timeline */}
      {pipVideoSrc && (
        <div
          className={`fixed left-6 top-36 z-30 rounded-2xl overflow-hidden bg-slate-950/90 border border-cyan-400/40 shadow-2xl backdrop-blur-xl transition-all ${
            pipLarge ? "w-96 h-60" : "w-60 h-36"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-1 bg-black/70 border-b border-white/10 text-[10px] font-mono text-cyan-300">
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" /> PiP INPUT SYNC
            </span>
            <button
              type="button"
              onClick={() => setPipLarge((prev) => !prev)}
              className="hover:text-white"
            >
              {pipLarge ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>
          </div>
          <video
            ref={pipVideoRef}
            src={pipVideoSrc}
            muted
            playsInline
            className="w-full h-[calc(100%-24px)] object-cover"
          />
        </div>
      )}

      {/* Contextual Glassmorphism Floating Drawers */}
      <FloatingDrawers
        activeDrawer={activeDrawer}
        onClose={() => setActiveDrawer(null)}
        manifest={manifest}
        currentAct={currentAct}
        livePose={livePose}
        onChangeLivePose={setLivePose}
        onBakeKeyframe={handleBakeKeyframe}
        selectedAgentId={selectedAgentId}
        onSelectAgentId={setSelectedAgentId}
        defaultPrompts={defaultPrompts}
        onRerunNode={handleRerunNode}
        isRerunning={isRerunning}
        vault={vault}
        onChangeVault={(nextVault) => {
          setVault(nextVault);
          try {
            localStorage.setItem("aitv_vault_v2", JSON.stringify(nextVault));
          } catch {
            // ignore
          }
        }}
        onTestVault={async () => {
          await syncHealth(vault);
        }}
        providerStatus={providerStatus}
        onDispatchHiggsfield={async (actNumber, prompt) => {
          if (!manifest) return;
          await dispatchHiggsfield({
            episodeId: manifest.episode_id,
            actNumber,
            prompt,
            vault,
          });
        }}
        isRecordingStage={isRecordingStage}
        onToggleRecordStage={handleToggleRecordStage}
        llmProvider={llmProvider}
      />

      {/* Retractable Multi-Track Timeline Sequencer */}
      <TimelineSequencer
        manifest={manifest}
        isOpen={timelineOpen}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={manifest?.total_duration_seconds || 12}
        currentAct={currentAct}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onSeek={handleSeek}
        onRestart={() => {
          handleSeek(0);
          setIsPlaying(true);
        }}
      />

      {/* Gemini OmniBar Multimodal Input Dock */}
      <GeminiOmniBar
        onProduce={handleProduce}
        isProducing={isProducing}
        timelineOpen={timelineOpen}
        onToggleTimeline={() => setTimelineOpen((prev) => !prev)}
      />
    </main>
  );
}
