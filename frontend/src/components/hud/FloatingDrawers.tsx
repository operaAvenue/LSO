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
}: FloatingDrawersProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customPromptText, setCustomPromptText] = useState<string>("");
  const [baking, setBaking] = useState(false);
  const [testingVault, setTestingVault] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  return (
    <aside className="fixed top-20 right-5 z-40 w-[min(430px,92vw)] max-h-[calc(100vh-120px)] flex flex-col rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.8)] text-slate-100 overflow-hidden">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
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
          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="p-5 overflow-y-auto space-y-4 text-xs">
        {statusMessage && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px]">
            {statusMessage}
          </div>
        )}

        {/* 1. RIG PUPPETEER DRAWER */}
        {activeDrawer === "PUPPETEER" && (
          <div className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Ato Selecionado na Agulha</div>
                <div className="font-bold text-sm text-white">
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
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/15 text-[11px] font-mono text-cyan-300"
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
                  <span className="text-slate-300 font-medium">{slider.label}</span>
                  <span className="font-mono text-cyan-400">
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
                  className="w-full accent-cyan-400 cursor-pointer"
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
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 disabled:opacity-40 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
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
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10">
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
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition ${
                    selectedAgentId === ag.id
                      ? "bg-fuchsia-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">
                System Prompt / Diretriz do Agente ({selectedAgentId.toUpperCase()}):
              </label>
              <textarea
                rows={8}
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.target.value)}
                className="w-full rounded-2xl bg-black/60 border border-white/15 p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-fuchsia-400"
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
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
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
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="font-bold text-xs text-white flex items-center justify-between">
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
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
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
                  className="py-2.5 px-3 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Manifesto JSON</span>
                </a>

                <a
                  href={`${BACKEND_URL}/api/v1/episodes/${manifest.episode_id}/blender-script`}
                  download={`blender_bridge_${manifest.episode_id}.py`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Script Blender (.py)</span>
                </a>
              </div>
            )}

            {/* Acts Breakdown: Higgsfield Prompts & ElevenLabs MP3 Downloads */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Atos, Prompts Higgsfield & Áudios MP3 ({manifest?.acts?.length || 0})
              </div>
              {manifest?.acts?.map((act) => (
                <div
                  key={act.act_number}
                  className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">
                      Ato 0{act.act_number} • {act.speaker_name}
                    </span>
                    {act.audio_url && (
                      <a
                        href={resolveBackendAssetUrl(act.audio_url)}
                        download={act.audio_file || `act_${act.act_number}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30"
                      >
                        <Download className="w-3 h-3" /> Baixar .MP3 (
                        {act.duration_seconds.toFixed(1)}s)
                      </a>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2 rounded-xl border border-white/5">
                    {act.higgsfield_prompt}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(act.higgsfield_prompt, `hf-${act.act_number}`)
                      }
                      className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
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
                      className="px-3 py-1.5 rounded-xl bg-fuchsia-600/30 hover:bg-fuchsia-600/50 border border-fuchsia-400/40 text-fuchsia-200 text-[11px] flex items-center gap-1 transition"
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
            <p className="text-[11px] text-slate-400 leading-relaxed">
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
                  <span className="font-medium text-slate-200">{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      providerStatus[item.statusKey]
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
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
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-200">
                ElevenLabs Voice ID Padrão
              </label>
              <input
                type="text"
                value={vault.voiceId}
                onChange={(e) => onChangeVault({ ...vault, voiceId: e.target.value })}
                placeholder="pNInz6obpgDQGcFmaJgB"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
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
                    "Cofre sincronizado e validado com o servidor FastAPI (http://localhost:8000)!"
                  );
                } catch (err: unknown) {
                  setStatusMessage(
                    err instanceof Error ? err.message : "Falha ao validar com o backend"
                  );
                } finally {
                  setTestingVault(false);
                }
              }}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
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
