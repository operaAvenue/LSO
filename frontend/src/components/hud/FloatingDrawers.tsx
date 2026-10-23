"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Copy,
  Check,
  Download,
  RefreshCw,
  Video,
  KeyRound,
  Sliders,
  Network,
  Share2,
  Send,
  ShieldCheck,
  Palette,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  ApiVaultState,
  BACKEND_URL,
  EpisodeManifest,
  InterpolationCurve,
  LLMProvider,
  ProducedAct,
  RigKeyframe,
  resolveBackendAssetUrl,
} from "@/lib/api";
import {
  AppThemeConfig,
  DEFAULT_THEME_CONFIG,
  THEME_PRESETS,
  ThemeCategory,
} from "@/lib/themes";
import { ActiveDrawerType } from "./TopStitchPill";

interface FloatingDrawersProps {
  activeDrawer: ActiveDrawerType;
  onClose: () => void;
  manifest: EpisodeManifest | null;
  currentAct: ProducedAct | null;
  livePose: RigKeyframe;
  onChangeLivePose: (pose: RigKeyframe) => void;
  onBakeKeyframe: () => Promise<void>;
  selectedAgentId: string;
  onSelectAgentId: (id: string) => void;
  defaultPrompts: Record<string, string>;
  onRerunNode: (agentId: string, customPrompt: string) => Promise<void>;
  isRerunning: boolean;
  vault: ApiVaultState;
  onChangeVault: (vault: ApiVaultState) => void;
  onTestVault: () => Promise<void>;
  providerStatus: Record<string, boolean>;
  onDispatchHiggsfield: (actNumber: number, prompt: string) => Promise<void>;
  isRecordingStage: boolean;
  onToggleRecordStage: () => void;
  llmProvider: LLMProvider;
  themeConfig: AppThemeConfig;
  onChangeThemeConfig: (nextTheme: AppThemeConfig) => void;
}

export default function FloatingDrawers({
  activeDrawer,
  onClose,
  manifest,
  currentAct,
  livePose,
  onChangeLivePose,
  onBakeKeyframe,
  selectedAgentId,
  onSelectAgentId,
  defaultPrompts,
  onRerunNode,
  isRerunning,
  vault,
  onChangeVault,
  onTestVault,
  providerStatus,
  onDispatchHiggsfield,
  isRecordingStage,
  onToggleRecordStage,
  themeConfig,
  onChangeThemeConfig,
}: FloatingDrawersProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customPromptText, setCustomPromptText] = useState<string>("");
  const [baking, setBaking] = useState(false);
  const [testingVault, setTestingVault] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<"ALL" | ThemeCategory>("ALL");

  useEffect(() => {
    const trace = manifest?.agent_traces?.find((t) => t.agent_id === selectedAgentId);
    if (trace?.system_prompt) {
      setCustomPromptText(trace.system_prompt);
    } else if (defaultPrompts[selectedAgentId]) {
      setCustomPromptText(defaultPrompts[selectedAgentId]);
    } else {
      setCustomPromptText(
        "Ajuste os parâmetros de síntese de voz ElevenLabs e sincronização de timecode."
      );
    }
  }, [selectedAgentId, manifest, defaultPrompts]);

  if (!activeDrawer) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const updatePoseField = (field: keyof RigKeyframe, value: number | InterpolationCurve) => {
    onChangeLivePose({
      ...livePose,
      [field]: value,
    });
  };

  const updateThemeField = <K extends keyof AppThemeConfig>(
    key: K,
    value: AppThemeConfig[K]
  ) => {
    onChangeThemeConfig({
      ...themeConfig,
      [key]: value,
    });
  };

  const generateRandomPastelTheme = (targetCategory: ThemeCategory) => {
    const baseHue = Math.floor(Math.random() * 360);
    const compHue = (baseHue + 45 + Math.floor(Math.random() * 90)) % 360;

    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    if (targetCategory === "LIGHT_PASTEL") {
      onChangeThemeConfig({
        ...themeConfig,
        id: `custom_light_${Date.now().toString().slice(-4)}`,
        name: `Harmonia Pastel Clara #${baseHue}°`,
        category: "LIGHT_PASTEL",
        description: "Gerada proceduralmente em tons pastéis suaves e luminosos",
        bgPrimary: hslToHex(baseHue, 42, 95),
        bgSecondary: hslToHex(baseHue, 38, 90),
        bgSurface: hslToHex(baseHue, 50, 98),
        textPrimary: hslToHex(baseHue, 35, 20),
        textMuted: hslToHex(baseHue, 22, 43),
        accentPrimary: hslToHex(baseHue, 70, 66),
        accentSecondary: hslToHex(compHue, 72, 68),
        accentText: "#ffffff",
        borderHex: hslToHex(baseHue, 45, 72),
      });
    } else {
      onChangeThemeConfig({
        ...themeConfig,
        id: `custom_dark_${Date.now().toString().slice(-4)}`,
        name: `Harmonia Pastel Escura #${baseHue}°`,
        category: "DARK_PASTEL",
        description: "Gerada proceduralmente em fundo noturno com acentos pastéis",
        bgPrimary: hslToHex(baseHue, 28, 10),
        bgSecondary: hslToHex(baseHue, 26, 15),
        bgSurface: hslToHex(baseHue, 26, 13),
        textPrimary: hslToHex(baseHue, 35, 93),
        textMuted: hslToHex(baseHue, 22, 68),
        accentPrimary: hslToHex(baseHue, 72, 74),
        accentSecondary: hslToHex(compHue, 70, 74),
        accentText: hslToHex(baseHue, 35, 12),
        borderHex: hslToHex(baseHue, 45, 68),
      });
    }
  };

  const filteredPresets = THEME_PRESETS.filter((p) =>
    paletteFilter === "ALL" ? true : p.category === paletteFilter
  );

  return (
    <aside className="fixed top-14 right-4 z-40 w-[min(450px,94vw)] max-h-[calc(100vh-110px)] flex flex-col theme-panel shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden">
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-bg-2)",
        }}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {activeDrawer === "THEME" && (
            <>
              <Palette
                className="w-4 h-4"
                style={{ color: "var(--theme-accent)" }}
              />
              <span>Estúdio de Temas & Paletas (Pastéis Claros/Escuros)</span>
            </>
          )}
          {activeDrawer === "PUPPETEER" && (
            <>
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Rig Puppeteer (IK/FK Live & Bake)</span>
            </>
          )}
          {activeDrawer === "INSPECTOR" && (
            <>
              <Network className="w-4 h-4 text-fuchsia-400" />
              <span>Node Inspector & Reprocessamento</span>
            </>
          )}
          {activeDrawer === "OUTPUTS" && (
            <>
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Outputs: Higgsfield, MP3, JSON & Blender</span>
            </>
          )}
          {activeDrawer === "VAULT" && (
            <>
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Cofre de Chaves (API Vault)</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:opacity-80 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="p-5 overflow-y-auto space-y-4 text-xs">
        {statusMessage && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[11px]">
            {statusMessage}
          </div>
        )}

        {/* 0. THEME & PASTEL PALETTE STUDIO DRAWER */}
        {activeDrawer === "THEME" && (
          <div className="space-y-4">
            {/* Active Theme Summary Banner */}
            <div
              className="p-3 rounded-2xl border flex items-center justify-between gap-2"
              style={{
                backgroundColor: "var(--theme-bg-2)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div>
                <div className="text-[10px] uppercase font-mono opacity-75">
                  Paleta Ativa ({themeConfig.category === "LIGHT_PASTEL" ? "Pastel Claro" : "Pastel Escuro"})
                </div>
                <div className="font-bold text-sm">{themeConfig.name}</div>
                <div className="text-[11px] opacity-75">{themeConfig.description}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {[
                  themeConfig.bgPrimary,
                  themeConfig.bgSurface,
                  themeConfig.accentPrimary,
                  themeConfig.accentSecondary,
                  themeConfig.textPrimary,
                ].map((hex, i) => (
                  <span
                    key={i}
                    className="w-4 h-7 rounded-md border border-black/20 shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl border"
              style={{
                backgroundColor: "var(--theme-bg)",
                borderColor: "var(--theme-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setPaletteFilter("ALL")}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  paletteFilter === "ALL" ? "theme-accent-bg shadow" : "opacity-75 hover:opacity-100"
                }`}
              >
                Todas ({THEME_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => setPaletteFilter("LIGHT_PASTEL")}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  paletteFilter === "LIGHT_PASTEL"
                    ? "theme-accent-bg shadow"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Pastéis Claros
              </button>
              <button
                type="button"
                onClick={() => setPaletteFilter("DARK_PASTEL")}
                className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  paletteFilter === "DARK_PASTEL"
                    ? "theme-accent-bg shadow"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Pastéis Escuros
              </button>
            </div>

            {/* Preset Cards Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = themeConfig.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onChangeThemeConfig({
                        ...preset,
                        surfaceOpacity: themeConfig.surfaceOpacity,
                        blurPx: themeConfig.blurPx,
                        borderRadiusPx: themeConfig.borderRadiusPx,
                        borderAlpha: themeConfig.borderAlpha,
                        uiScale: themeConfig.uiScale,
                        syncStageBackground: themeConfig.syncStageBackground,
                      })
                    }
                    className="p-2.5 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer hover:scale-[1.01]"
                    style={{
                      backgroundColor: preset.bgSurface,
                      color: preset.textPrimary,
                      borderColor: isSelected ? preset.accentPrimary : preset.borderHex,
                      boxShadow: isSelected
                        ? `0 0 0 2px ${preset.accentPrimary}`
                        : "none",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] truncate">
                        {preset.name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
                        style={{
                          backgroundColor: preset.accentPrimary,
                          color: preset.accentText,
                        }}
                      >
                        {preset.category === "LIGHT_PASTEL" ? "CLARO" : "ESCURO"}
                      </span>
                    </div>

                    {/* Swatch Strip */}
                    <div className="flex items-center gap-1 w-full h-4 rounded-md overflow-hidden border border-black/10">
                      <div
                        className="flex-1 h-full"
                        style={{ backgroundColor: preset.bgPrimary }}
                        title="Fundo Principal"
                      />
                      <div
                        className="flex-1 h-full"
                        style={{ backgroundColor: preset.bgSecondary }}
                        title="Fundo Secundário"
                      />
                      <div
                        className="flex-1 h-full"
                        style={{ backgroundColor: preset.accentPrimary }}
                        title="Destaque Primário"
                      />
                      <div
                        className="flex-1 h-full"
                        style={{ backgroundColor: preset.accentSecondary }}
                        title="Destaque Secundário"
                      />
                      <div
                        className="flex-1 h-full"
                        style={{ backgroundColor: preset.textPrimary }}
                        title="Texto"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Harmony Generator Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => generateRandomPastelTheme("LIGHT_PASTEL")}
                className="py-2 px-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: "var(--theme-bg-2)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerar Pastel Claro</span>
              </button>
              <button
                type="button"
                onClick={() => generateRandomPastelTheme("DARK_PASTEL")}
                className="py-2 px-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: "var(--theme-bg-2)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Gerar Pastel Escuro</span>
              </button>
            </div>

            {/* Sync Stage Background Toggle */}
            <label
              className="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: "var(--theme-bg-2)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div>
                <div className="font-bold text-[11px]">
                  Sincronizar Fundo do Palco 3D/2D com a Paleta
                </div>
                <div className="text-[10px] opacity-75">
                  Aplica as cores de fundo do tema diretamente no horizonte do cenário
                </div>
              </div>
              <input
                type="checkbox"
                checked={themeConfig.syncStageBackground}
                onChange={(e) =>
                  updateThemeField("syncStageBackground", e.target.checked)
                }
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </label>

            {/* Granular Color Pickers (8 Pickers) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                Ajuste Fino de Cores (8 Canais em Tempo Real)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "bgPrimary" as const, label: "Fundo Principal" },
                  { key: "bgSecondary" as const, label: "Fundo Secundário" },
                  { key: "bgSurface" as const, label: "Superfície / Painéis" },
                  { key: "accentPrimary" as const, label: "Destaque Primário" },
                  { key: "accentSecondary" as const, label: "Destaque Secundário" },
                  { key: "textPrimary" as const, label: "Texto Principal" },
                  { key: "textMuted" as const, label: "Texto Suave (Muted)" },
                  { key: "borderHex" as const, label: "Cor das Bordas" },
                ].map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center justify-between p-2 rounded-xl border cursor-pointer"
                    style={{
                      backgroundColor: "var(--theme-bg)",
                      borderColor: "var(--theme-border)",
                    }}
                  >
                    <div className="truncate pr-2">
                      <div className="text-[10px] font-semibold truncate">
                        {c.label}
                      </div>
                      <div className="text-[9px] font-mono opacity-70 uppercase">
                        {themeConfig[c.key]}
                      </div>
                    </div>
                    <input
                      type="color"
                      value={themeConfig[c.key]}
                      onChange={(e) => updateThemeField(c.key, e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Granular UI & Glassmorphism Sliders */}
            <div className="space-y-2.5 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                Geometria, Transparência & Glassmorphism
              </div>

              {[
                {
                  key: "surfaceOpacity" as const,
                  label: "Opacidade dos Painéis",
                  min: 0.35,
                  max: 0.98,
                  step: 0.02,
                  format: (v: number) => `${Math.round(v * 100)}%`,
                },
                {
                  key: "blurPx" as const,
                  label: "Intensidade do Blur (Vidro)",
                  min: 0,
                  max: 40,
                  step: 2,
                  format: (v: number) => `${v}px`,
                },
                {
                  key: "borderRadiusPx" as const,
                  label: "Arredondamento de Cantos",
                  min: 4,
                  max: 28,
                  step: 2,
                  format: (v: number) => `${v}px`,
                },
                {
                  key: "borderAlpha" as const,
                  label: "Contraste das Bordas",
                  min: 0.08,
                  max: 0.55,
                  step: 0.02,
                  format: (v: number) => `${Math.round(v * 100)}%`,
                },
                {
                  key: "uiScale" as const,
                  label: "Escala Geral da Interface",
                  min: 0.9,
                  max: 1.1,
                  step: 0.02,
                  format: (v: number) => `${Math.round(v * 100)}%`,
                },
              ].map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium">{s.label}</span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--theme-accent)" }}
                    >
                      {s.format(Number(themeConfig[s.key]))}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={Number(themeConfig[s.key])}
                    onChange={(e) =>
                      updateThemeField(s.key, parseFloat(e.target.value))
                    }
                    className="w-full cursor-pointer"
                    style={{ accentColor: "var(--theme-accent)" }}
                  />
                </div>
              ))}
            </div>

            {/* Reset Default Theme Button */}
            <button
              type="button"
              onClick={() => onChangeThemeConfig(DEFAULT_THEME_CONFIG)}
              className="w-full py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: "var(--theme-bg-2)",
                borderColor: "var(--theme-border)",
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Paleta Padrão (Noite Lavanda Pastel)</span>
            </button>
          </div>
        )}

        {/* 1. RIG PUPPETEER DRAWER */}
        {activeDrawer === "PUPPETEER" && (
          <div className="space-y-3.5">
            <div
              className="p-3 rounded-2xl border flex items-center justify-between"
              style={{
                backgroundColor: "var(--theme-bg-2)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div>
                <div className="text-[11px] opacity-70">Ato Selecionado na Agulha</div>
                <div className="font-bold text-sm">
                  {currentAct
                    ? `Ato 0${currentAct.act_number} — ${currentAct.speaker_name}`
                    : "Pose Manual do Estúdio"}
                </div>
              </div>
              <select
                value={livePose.interpolation}
                onChange={(e) =>
                  updatePoseField("interpolation", e.target.value as InterpolationCurve)
                }
                className="px-2.5 py-1 rounded-xl border text-[11px] font-mono"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-accent)",
                }}
              >
                <option value="CUBIC_BEZIER">CUBIC_BEZIER (3D)</option>
                <option value="STEP_SOUTHPARK">STEP_SOUTHPARK (12fps)</option>
              </select>
            </div>

            {[
              {
                key: "head_pitch" as const,
                label: "Head Pitch (Vertical)",
                min: -45,
                max: 45,
                step: 1,
                unit: "°",
              },
              {
                key: "head_yaw" as const,
                label: "Head Yaw (Horizontal)",
                min: -60,
                max: 60,
                step: 1,
                unit: "°",
              },
              {
                key: "torso_lean" as const,
                label: "Torso Lean (Inclinação)",
                min: -30,
                max: 30,
                step: 1,
                unit: "°",
              },
              {
                key: "left_arm_ik" as const,
                label: "Left Arm IK (Braço Esq.)",
                min: 0,
                max: 1,
                step: 0.02,
                unit: "",
              },
              {
                key: "right_arm_ik" as const,
                label: "Right Arm IK (Braço Dir.)",
                min: 0,
                max: 1,
                step: 0.02,
                unit: "",
              },
              {
                key: "jaw_open" as const,
                label: "Jaw Open (Abertura Base)",
                min: 0,
                max: 1,
                step: 0.02,
                unit: "",
              },
              {
                key: "brow_raise" as const,
                label: "Brow Raise (Sobrancelhas)",
                min: -1,
                max: 1,
                step: 0.05,
                unit: "",
              },
              {
                key: "camera_fov" as const,
                label: "Camera FOV (Lente)",
                min: 20,
                max: 90,
                step: 1,
                unit: "°",
              },
            ].map((slider) => (
              <div key={slider.key} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium">{slider.label}</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: "var(--theme-accent)" }}
                  >
                    {Number(livePose[slider.key]).toFixed(slider.step < 1 ? 2 : 0)}
                    {slider.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={Number(livePose[slider.key])}
                  onChange={(e) => updatePoseField(slider.key, parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: "var(--theme-accent)" }}
                />
              </div>
            ))}

            <button
              type="button"
              disabled={!manifest || baking}
              onClick={async () => {
                setBaking(true);
                setStatusMessage(null);
                try {
                  await onBakeKeyframe();
                  setStatusMessage(
                    `Pose gravada (Baked) com sucesso no Ato 0${
                      currentAct?.act_number || 1
                    } do Manifesto JSON!`
                  );
                } catch (err: unknown) {
                  setStatusMessage(
                    err instanceof Error ? err.message : "Erro ao gravar keyframe"
                  );
                } finally {
                  setBaking(false);
                }
              }}
              className="w-full py-2.5 rounded-2xl theme-accent-bg hover:opacity-95 disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {baking
                  ? "Gravando no Manifesto..."
                  : `Bake Pose no Keyframe Atual (Ato 0${currentAct?.act_number || 1})`}
              </span>
            </button>
          </div>
        )}

        {/* 2. NODE INSPECTOR DRAWER */}
        {activeDrawer === "INSPECTOR" && (
          <div className="space-y-3.5">
            <div
              className="flex items-center gap-1.5 p-1 rounded-2xl border"
              style={{
                backgroundColor: "var(--theme-bg)",
                borderColor: "var(--theme-border)",
              }}
            >
              {[
                { id: "marcus", label: "1. Marcus Vance" },
                { id: "maya", label: "2. Maya Lin" },
                { id: "viktor", label: "3. Viktor K." },
                { id: "elevenlabs", label: "4. ElevenLabs" },
              ].map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => onSelectAgentId(ag.id)}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                    selectedAgentId === ag.id
                      ? "theme-accent-bg"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] opacity-75 mb-1.5">
                System Prompt / Diretriz do Agente ({selectedAgentId.toUpperCase()}):
              </label>
              <textarea
                rows={8}
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.target.value)}
                className="w-full rounded-2xl border p-3 text-xs font-mono leading-relaxed focus:outline-none"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text)",
                }}
              />
            </div>

            <button
              type="button"
              disabled={!manifest || isRerunning}
              onClick={async () => {
                setStatusMessage(null);
                try {
                  await onRerunNode(selectedAgentId, customPromptText);
                  setStatusMessage(
                    `Cadeia reprocessada com sucesso a partir do agente ${selectedAgentId.toUpperCase()}!`
                  );
                } catch (err: unknown) {
                  setStatusMessage(
                    err instanceof Error ? err.message : "Erro ao reprocessar node"
                  );
                }
              }}
              className="w-full py-2.5 rounded-2xl theme-accent-bg hover:opacity-95 disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRerunning ? "animate-spin" : ""}`} />
              <span>
                {isRerunning
                  ? "Reprocessando Cadeia..."
                  : "Reprocessar Cadeia a partir deste Node"}
              </span>
            </button>
          </div>
        )}

        {/* 3. OUTPUTS & EXPORT DRAWER */}
        {activeDrawer === "OUTPUTS" && (
          <div className="space-y-4">
            {/* Stage Screen/Canvas Video Recorder */}
            <div
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: "var(--theme-bg-2)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Gravador de Palco (MediaRecorder .webm)</span>
                {isRecordingStage && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] animate-pulse">
                    ● GRAVANDO
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onToggleRecordStage}
                className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  isRecordingStage
                    ? "bg-red-600 text-white"
                    : "theme-accent-bg hover:opacity-95"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>
                  {isRecordingStage
                    ? "Parar e Baixar Vídeo do Palco (.webm)"
                    : "Gravar Palco + Áudio em Vídeo (.webm)"}
                </span>
              </button>
            </div>

            {/* Manifest JSON & Blender Python Bridge Downloads */}
            {manifest && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={resolveBackendAssetUrl(manifest.manifest_url)}
                  download={`${manifest.episode_id}.json`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-2xl border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition hover:opacity-90"
                  style={{
                    backgroundColor: "var(--theme-bg-2)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Manifesto JSON</span>
                </a>

                <a
                  href={`${BACKEND_URL}/api/v1/episodes/${manifest.episode_id}/blender-script`}
                  download={`blender_bridge_${manifest.episode_id}.py`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-2xl border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition hover:opacity-90"
                  style={{
                    backgroundColor: "var(--theme-bg-2)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Script Blender (.py)</span>
                </a>
              </div>
            )}

            {/* Acts Breakdown: Higgsfield Prompts & ElevenLabs MP3 Downloads */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Atos, Prompts Higgsfield & Áudios MP3 ({manifest?.acts?.length || 0})
              </div>
              {manifest?.acts?.map((act) => (
                <div
                  key={act.act_number}
                  className="p-3 rounded-2xl border space-y-2"
                  style={{
                    backgroundColor: "var(--theme-bg-2)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-bold"
                      style={{ color: "var(--theme-accent)" }}
                    >
                      Ato 0{act.act_number} • {act.speaker_name}
                    </span>
                    {act.audio_url && (
                      <a
                        href={resolveBackendAssetUrl(act.audio_url)}
                        download={act.audio_file || `act_${act.act_number}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30"
                      >
                        <Download className="w-3 h-3" /> Baixar .MP3 (
                        {act.duration_seconds.toFixed(1)}s)
                      </a>
                    )}
                  </div>

                  <p
                    className="text-[11px] font-mono p-2 rounded-xl border"
                    style={{
                      backgroundColor: "var(--theme-bg)",
                      borderColor: "var(--theme-border)",
                    }}
                  >
                    {act.higgsfield_prompt}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(act.higgsfield_prompt, `hf-${act.act_number}`)
                      }
                      className="flex-1 py-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                      style={{
                        backgroundColor: "var(--theme-bg)",
                        borderColor: "var(--theme-border)",
                      }}
                    >
                      {copiedKey === `hf-${act.act_number}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Prompt Higgsfield
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setStatusMessage(null);
                        try {
                          await onDispatchHiggsfield(act.act_number, act.higgsfield_prompt);
                          setStatusMessage(
                            `Ato 0${act.act_number} enviado para o Webhook Higgsfield!`
                          );
                        } catch (err: unknown) {
                          setStatusMessage(
                            err instanceof Error
                              ? err.message
                              : "Configure a chave Higgsfield no API Vault"
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl theme-accent-bg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> API
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. API VAULT DRAWER */}
        {activeDrawer === "VAULT" && (
          <div className="space-y-3">
            <p className="text-[11px] opacity-75 leading-relaxed">
              As chaves são salvas no seu navegador e enviadas via Headers HTTP seguros para o Back-End FastAPI em cada produção.
            </p>

            {[
              {
                field: "gemini" as const,
                label: "Google Gemini API Key (google-genai)",
                statusKey: "gemini",
                placeholder: "AIzaSy...",
              },
              {
                field: "openai" as const,
                label: "OpenAI API Key (GPT-4o + Whisper)",
                statusKey: "chatgpt",
                placeholder: "sk-proj-...",
              },
              {
                field: "anthropic" as const,
                label: "Anthropic API Key (Claude 3.5 Sonnet)",
                statusKey: "claude",
                placeholder: "sk-ant-...",
              },
              {
                field: "xai" as const,
                label: "xAI Grok API Key (Grok-2)",
                statusKey: "grok",
                placeholder: "xai-...",
              },
              {
                field: "elevenlabs" as const,
                label: "ElevenLabs API Key (v1/text-to-speech)",
                statusKey: "elevenlabs",
                placeholder: "sk_...",
              },
              {
                field: "higgsfield" as const,
                label: "Higgsfield API Key / Token",
                statusKey: "higgsfield",
                placeholder: "hf_...",
              },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      providerStatus[item.statusKey]
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "opacity-60"
                    }`}
                  >
                    {providerStatus[item.statusKey] ? "ATIVO" : "OPCIONAL"}
                  </span>
                </div>
                <input
                  type="password"
                  value={vault[item.field]}
                  placeholder={item.placeholder}
                  onChange={(e) =>
                    onChangeVault({ ...vault, [item.field]: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: "var(--theme-bg)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-text)",
                  }}
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="block text-[11px] font-medium">
                ElevenLabs Voice ID Padrão
              </label>
              <input
                type="text"
                value={vault.voiceId}
                onChange={(e) => onChangeVault({ ...vault, voiceId: e.target.value })}
                placeholder="pNInz6obpgDQGcFmaJgB"
                className="w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: "var(--theme-bg)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text)",
                }}
              />
            </div>

            <button
              type="button"
              disabled={testingVault}
              onClick={async () => {
                setTestingVault(true);
                setStatusMessage(null);
                try {
                  await onTestVault();
                  setStatusMessage(
                    "Cofre sincronizado e validado com o servidor FastAPI!"
                  );
                } catch (err: unknown) {
                  setStatusMessage(
                    err instanceof Error ? err.message : "Falha ao validar com o backend"
                  );
                } finally {
                  setTestingVault(false);
                }
              }}
              className="w-full py-2.5 rounded-2xl theme-accent-bg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {testingVault
                  ? "Validando Conexão..."
                  : "Salvar & Validar Chaves no Back-End"}
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
