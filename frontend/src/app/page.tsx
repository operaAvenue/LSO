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
import StudioEditorDrawer, {
  StudioEditorTab,
} from "@/components/hud/StudioEditorDrawer";
import {
  ApiVaultState,
  CameraBookmark,
  CharacterSpec,
  DEFAULT_CAMERAS,
  DEFAULT_CHARACTERS,
  DEFAULT_LIGHTING,
  DEFAULT_QUALITY,
  DEFAULT_SCENE_OBJECTS,
  DEFAULT_STUDIO_LAYERS,
  EpisodeManifest,
  LLMProvider,
  ProducedAct,
  RigKeyframe,
  SceneObjectItem,
  StudioLayer,
  StudioLightConfig,
  StudioProjectState,
  TVProgramType,
  ViewportQualityConfig,
  bakeRigKeyframe,
  deleteStudioProject,
  dispatchHiggsfield,
  fetchEpisodes,
  fetchHealth,
  fetchStudioProjects,
  produceEpisode,
  rerunAgentNode,
  resolveBackendAssetUrl,
  saveStudioProject,
} from "@/lib/api";
import {
  AppThemeConfig,
  DEFAULT_THEME_CONFIG,
  THEME_PRESETS,
  hexToRgba,
} from "@/lib/themes";
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
  const [selectedProgram, setSelectedProgram] =
    useState<TVProgramType>("Plantão Neural 24h");
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("squad_mode");
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>("STAGE");
  const [renderStageMode, setRenderStageMode] =
    useState<RenderStageMode>("3D");
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerType>(null);
  const [timelineOpen, setTimelineOpen] = useState<boolean>(true);
  const [themeConfig, setThemeConfig] =
    useState<AppThemeConfig>(DEFAULT_THEME_CONFIG);

  // Studio Scene Editor States (3D/2D Objects, Characters, Layers, Lights, Cameras, Quality, Projects)
  const [studioEditorOpen, setStudioEditorOpen] = useState<boolean>(false);
  const [studioEditorTab, setStudioEditorTab] =
    useState<StudioEditorTab>("OBJECTS");
  const [projectId, setProjectId] = useState<string>("proj_redebot_main");
  const [projectName, setProjectName] = useState<string>(
    "Estúdio Principal Redebot TV"
  );
  const [layers, setLayers] = useState<StudioLayer[]>(DEFAULT_STUDIO_LAYERS);
  const [sceneObjects, setSceneObjects] = useState<SceneObjectItem[]>(
    DEFAULT_SCENE_OBJECTS
  );
  const [characters, setCharacters] =
    useState<CharacterSpec[]>(DEFAULT_CHARACTERS);
  const [lighting, setLighting] = useState<StudioLightConfig>(DEFAULT_LIGHTING);
  const [cameras, setCameras] = useState<CameraBookmark[]>(DEFAULT_CAMERAS);
  const [activeCameraId, setActiveCameraId] = useState<string>("cam_master");
  const [quality, setQuality] = useState<ViewportQualityConfig>(DEFAULT_QUALITY);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<
    "translate" | "rotate" | "scale"
  >("translate");
  const [savedProjects, setSavedProjects] = useState<StudioProjectState[]>([]);

  // Episode & Production States
  const [manifest, setManifest] = useState<EpisodeManifest | null>(null);
  const [isProducing, setIsProducing] = useState<boolean>(false);
  const [isRerunning, setIsRerunning] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("marcus");
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, string>>(
    {}
  );
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>(
    {}
  );
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
  const [localPreviewVideoUrl, setLocalPreviewVideoUrl] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aitv_vault_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        setVault((prev) => ({ ...prev, ...parsed }));
      }
      const savedLocalScene = localStorage.getItem("aitv_studio_project_v25");
      if (savedLocalScene) {
        const proj: StudioProjectState = JSON.parse(savedLocalScene);
        if (proj.layers?.length) setLayers(proj.layers);
        if (proj.scene_objects?.length) setSceneObjects(proj.scene_objects);
        if (proj.characters?.length) setCharacters(proj.characters);
        if (proj.lighting) setLighting(proj.lighting);
        if (proj.cameras?.length) setCameras(proj.cameras);
        if (proj.quality) setQuality(proj.quality);
      }
      const savedTheme = localStorage.getItem("aitv_theme_v26");
      if (savedTheme) {
        const parsedTheme: AppThemeConfig = JSON.parse(savedTheme);
        setThemeConfig((prev) => ({ ...prev, ...parsedTheme }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Apply active themeConfig CSS Variables to document root & sync stage background if enabled
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-bg", themeConfig.bgPrimary);
    root.style.setProperty("--theme-bg-2", themeConfig.bgSecondary);
    root.style.setProperty(
      "--theme-surface",
      hexToRgba(themeConfig.bgSurface, themeConfig.surfaceOpacity)
    );
    root.style.setProperty("--theme-surface-solid", themeConfig.bgSurface);
    root.style.setProperty("--theme-text", themeConfig.textPrimary);
    root.style.setProperty("--theme-muted", themeConfig.textMuted);
    root.style.setProperty("--theme-accent", themeConfig.accentPrimary);
    root.style.setProperty("--theme-accent-2", themeConfig.accentSecondary);
    root.style.setProperty("--theme-accent-text", themeConfig.accentText);
    root.style.setProperty(
      "--theme-border",
      hexToRgba(themeConfig.borderHex, themeConfig.borderAlpha)
    );
    root.style.setProperty("--theme-radius", `${themeConfig.borderRadiusPx}px`);
    root.style.setProperty("--theme-blur", `${themeConfig.blurPx}px`);
    root.style.setProperty("--theme-scale", String(themeConfig.uiScale));

    try {
      localStorage.setItem("aitv_theme_v26", JSON.stringify(themeConfig));
    } catch {
      // ignore
    }

    if (themeConfig.syncStageBackground) {
      setLighting((prev) => ({
        ...prev,
        background_top: themeConfig.bgPrimary,
        background_bottom: themeConfig.bgSecondary,
        fog_color: themeConfig.bgPrimary,
      }));
    }
  }, [themeConfig]);

  const syncHealth = useCallback(async (currentVault: ApiVaultState) => {
    try {
      const data = await fetchHealth(currentVault);
      if (data.providers) setProviderStatus(data.providers);
      if (data.default_prompts) setDefaultPrompts(data.default_prompts);
    } catch {
      // backend might still be starting
    }
  }, []);

  const refreshSavedProjects = useCallback(async () => {
    const list = await fetchStudioProjects();
    setSavedProjects(list);
  }, []);

  useEffect(() => {
    syncHealth(vault);
    refreshSavedProjects();
    fetchEpisodes()
      .then((list) => {
        if (list.length > 0) {
          const latest = list[0];
          setManifest(latest);
          setSelectedProgram(latest.selected_program);
          setRenderStageMode(
            latest.visual_mode_recommendation === "2D_SOUTHPARK"
              ? "2D_SOUTHPARK"
              : "3D"
          );
          if (latest.acts?.[0]?.rig_keyframe) {
            setLivePose(latest.acts[0].rig_keyframe);
          }
        }
      })
      .catch(() => {});
  }, [syncHealth, refreshSavedProjects, vault]);

  const activeCamera: CameraBookmark = useMemo(
    () =>
      cameras.find((c) => c.id === activeCameraId) ||
      cameras[0] ||
      DEFAULT_CAMERAS[0],
    [cameras, activeCameraId]
  );

  // Determine current Act based on timeline playhead
  const currentAct: ProducedAct | null = useMemo(() => {
    if (!manifest?.acts?.length) return null;
    const found = manifest.acts.find(
      (a) => currentTime >= a.start_time && currentTime <= a.end_time + 0.05
    );
    return found || manifest.acts[manifest.acts.length - 1];
  }, [manifest, currentTime]);

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
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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

  // Master playback loop
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

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqBins);
        let sum = 0;
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
    } else if (
      isPlaying &&
      audioEl.paused &&
      offsetWithinAct < currentAct.duration_seconds - 0.15
    ) {
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
        audioElRef.current.currentTime = Math.max(
          0,
          targetSeconds - targetAct.start_time
        );
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
        created.visual_mode_recommendation === "2D_SOUTHPARK"
          ? "2D_SOUTHPARK"
          : "3D"
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

  const buildCurrentProjectPayload = useCallback((): StudioProjectState => {
    return {
      project_id: projectId || `proj_${Date.now().toString().slice(-6)}`,
      name: projectName || "Estúdio Redebot",
      updated_at: new Date().toISOString(),
      selected_program: selectedProgram,
      render_stage_mode: renderStageMode,
      layers,
      scene_objects: sceneObjects,
      characters,
      lighting,
      cameras,
      active_camera_id: activeCameraId,
      quality,
      active_episode_id: manifest?.episode_id || null,
    };
  }, [
    projectId,
    projectName,
    selectedProgram,
    renderStageMode,
    layers,
    sceneObjects,
    characters,
    lighting,
    cameras,
    activeCameraId,
    quality,
    manifest?.episode_id,
  ]);

  const handleSaveStudioProject = async () => {
    const payload = buildCurrentProjectPayload();
    try {
      localStorage.setItem("aitv_studio_project_v25", JSON.stringify(payload));
    } catch {
      // ignore
    }
    const saved = await saveStudioProject(payload);
    setProjectId(saved.project_id);
    await refreshSavedProjects();
  };

  const handleLoadStudioProject = (proj: StudioProjectState) => {
    setProjectId(proj.project_id);
    setProjectName(proj.name);
    setSelectedProgram(proj.selected_program);
    setRenderStageMode(proj.render_stage_mode);
    if (proj.layers?.length) setLayers(proj.layers);
    if (proj.scene_objects) setSceneObjects(proj.scene_objects);
    if (proj.characters?.length) setCharacters(proj.characters);
    if (proj.lighting) setLighting(proj.lighting);
    if (proj.cameras?.length) setCameras(proj.cameras);
    if (proj.active_camera_id) setActiveCameraId(proj.active_camera_id);
    if (proj.quality) setQuality(proj.quality);
  };

  const handleExportProjectJson = () => {
    const payload = buildCurrentProjectPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.project_id}.json`;
    a.click();
  };

  const handleImportProjectJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed: StudioProjectState = JSON.parse(text);
      handleLoadStudioProject(parsed);
    } catch {
      setErrorBanner("Arquivo JSON de projeto inválido.");
    }
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
      setErrorBanner(
        "Mude para o Modo Palco 3D para gravar o canvas via MediaRecorder."
      );
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
    <main
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-text)",
      }}
    >
      {/* Hidden Real HTMLAudioElement with CORS enabled for Web Audio API AnalyserNode */}
      <audio ref={audioElRef} crossOrigin="anonymous" className="hidden" />

      {/* Top Full-Width Stitch Bar (100% Left-to-Right) */}
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
        studioEditorOpen={studioEditorOpen}
        onOpenStudioEditorTab={(tab) => {
          if (studioEditorOpen && studioEditorTab === tab) {
            setStudioEditorOpen(false);
          } else {
            setStudioEditorTab(tab);
            setStudioEditorOpen(true);
          }
        }}
        providerStatus={providerStatus}
        themeConfig={themeConfig}
        onQuickToggleCategory={() => {
          const targetCategory =
            themeConfig.category === "LIGHT_PASTEL"
              ? "DARK_PASTEL"
              : "LIGHT_PASTEL";
          const nextPreset =
            THEME_PRESETS.find((p) => p.category === targetCategory) ||
            DEFAULT_THEME_CONFIG;
          setThemeConfig((prev) => ({
            ...nextPreset,
            surfaceOpacity: prev.surfaceOpacity,
            blurPx: prev.blurPx,
            borderRadiusPx: prev.borderRadiusPx,
            borderAlpha: prev.borderAlpha,
            uiScale: prev.uiScale,
            syncStageBackground: prev.syncStageBackground,
          }));
        }}
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

      {/* 100vw x 100vh Unobstructed Spatial Canvas */}
      <div className="w-full h-full flex">
        {(layoutMode === "STAGE" || layoutMode === "SPLIT") && (
          <div
            className={`h-full relative ${
              layoutMode === "SPLIT"
                ? "w-1/2 border-r border-white/10"
                : "w-full"
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
                timelineOpen={timelineOpen}
                layers={layers}
                sceneObjects={sceneObjects}
                characters={characters}
                lighting={lighting}
                activeCamera={activeCamera}
                quality={quality}
                selectedItemId={selectedItemId}
                onSelectItem={(id) => {
                  setSelectedItemId(id);
                  if (id && !studioEditorOpen) {
                    setStudioEditorTab(
                      id.startsWith("char_") ? "CHARACTERS" : "OBJECTS"
                    );
                    setStudioEditorOpen(true);
                  }
                }}
                transformMode={transformMode}
                onUpdateObjectTransform={(id, pos, rot, scl) => {
                  setSceneObjects((prev) =>
                    prev.map((o) =>
                      o.id === id
                        ? { ...o, position: pos, rotation: rot, scale: scl }
                        : o
                    )
                  );
                }}
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
                timelineOpen={timelineOpen}
                layers={layers}
                sceneObjects={sceneObjects}
                characters={characters}
                lighting={lighting}
                selectedItemId={selectedItemId}
                onSelectItem={(id) => {
                  setSelectedItemId(id);
                  if (id && !studioEditorOpen) {
                    setStudioEditorTab(
                      id.startsWith("char_") ? "CHARACTERS" : "OBJECTS"
                    );
                    setStudioEditorOpen(true);
                  }
                }}
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

      {/* Left Floating Studio Scene & Character Editor Drawer */}
      <StudioEditorDrawer
        isOpen={studioEditorOpen}
        activeTab={studioEditorTab}
        onSelectTab={setStudioEditorTab}
        onClose={() => setStudioEditorOpen(false)}
        layers={layers}
        onChangeLayers={setLayers}
        sceneObjects={sceneObjects}
        onChangeSceneObjects={setSceneObjects}
        characters={characters}
        onChangeCharacters={setCharacters}
        lighting={lighting}
        onChangeLighting={setLighting}
        cameras={cameras}
        onChangeCameras={setCameras}
        activeCameraId={activeCameraId}
        onSelectCameraId={setActiveCameraId}
        quality={quality}
        onChangeQuality={setQuality}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        transformMode={transformMode}
        onChangeTransformMode={setTransformMode}
        projectName={projectName}
        onChangeProjectName={setProjectName}
        savedProjects={savedProjects}
        onSaveProject={handleSaveStudioProject}
        onLoadProject={handleLoadStudioProject}
        onDeleteProject={async (id) => {
          await deleteStudioProject(id);
          await refreshSavedProjects();
        }}
        onExportProjectJson={handleExportProjectJson}
        onImportProjectJson={handleImportProjectJson}
      />

      {/* Resizable Picture-in-Picture (PiP) Input Video Monitor */}
      {pipVideoSrc && (
        <div
          className={`fixed right-6 top-20 z-30 rounded-2xl overflow-hidden bg-slate-950/90 border border-cyan-400/40 shadow-2xl backdrop-blur-xl transition-all ${
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

      {/* Right Contextual Glassmorphism Floating Drawers (Rig Puppeteer, Inspector, Outputs, Vault) */}
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
        themeConfig={themeConfig}
        onChangeThemeConfig={setThemeConfig}
      />

      {/* Gemini OmniBar Floating ABOVE the Full-Width Footer Timeline */}
      <GeminiOmniBar
        onProduce={handleProduce}
        isProducing={isProducing}
        timelineOpen={timelineOpen}
      />

      {/* Full-Width Left-to-Right Footer Timeline Sequencer (100% Horizontal Width) */}
      <TimelineSequencer
        manifest={manifest}
        isOpen={timelineOpen}
        onToggleOpen={() => setTimelineOpen((prev) => !prev)}
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
    </main>
  );
}
