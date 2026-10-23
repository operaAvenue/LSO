export type TVProgramType =
  | "Plantão Neural 24h"
  | "Choque de Cortiça"
  | "Mesa Redonda Viral"
  | "Dossiê Hiper-Real";

export type LLMProvider =
  | "gemini"
  | "chatgpt"
  | "claude"
  | "grok"
  | "squad_mode";

export type EmotionType =
  | "SHOCK"
  | "OUTRAGE"
  | "SARCASM"
  | "ANALYTICAL"
  | "HYSTERICAL";

export type InterpolationCurve = "STEP_SOUTHPARK" | "CUBIC_BEZIER";

export interface RigKeyframe {
  head_pitch: number;
  head_yaw: number;
  torso_lean: number;
  left_arm_ik: number;
  right_arm_ik: number;
  jaw_open: number;
  brow_raise: number;
  camera_fov: number;
  interpolation: InterpolationCurve;
}

export interface VoiceSettings {
  voice_id: string;
  stability: number;
  similarity_boost: number;
  style_exaggeration: number;
}

export interface ProducedAct {
  act_number: number;
  speaker_name: string;
  speaker_role: string;
  retention_hook_2s: string;
  dialogue_text: string;
  dominant_emotion: EmotionType;
  social_cut_caption: string;
  voice_settings: VoiceSettings;
  higgsfield_prompt: string;
  camera_shot_label: string;
  lighting_preset: string;
  rig_keyframe: RigKeyframe;
  audio_file?: string | null;
  audio_url?: string | null;
  duration_seconds: number;
  start_time: number;
  end_time: number;
  word_timestamps: Array<{ word: string; start: number; end: number }>;
  higgsfield_job_id?: string | null;
  higgsfield_status?: string | null;
}

export interface AgentExecutionTrace {
  agent_id: string;
  agent_name: string;
  agent_role: string;
  provider_used: string;
  model_used: string;
  system_prompt: string;
  latency_ms: number;
  status: string;
  summary_output: string;
}

export interface EpisodeManifest {
  episode_id: string;
  created_at: string;
  episode_title: string;
  breaking_chyron: string;
  selected_program: TVProgramType;
  editorial_thesis: string;
  viral_headline: string;
  hashtags: string[];
  visual_mode_recommendation: string;
  studio_lighting_setup: string;
  llm_mode: LLMProvider;
  input_media_url?: string | null;
  input_media_filename?: string | null;
  input_transcript?: string | null;
  total_duration_seconds: number;
  acts: ProducedAct[];
  agent_traces: AgentExecutionTrace[];
  manifest_url: string;
}

export interface ApiVaultState {
  gemini: string;
  openai: string;
  anthropic: string;
  xai: string;
  elevenlabs: string;
  higgsfield: string;
  voiceId: string;
}

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "";

function buildVaultHeaders(vault: ApiVaultState): Record<string, string> {
  const headers: Record<string, string> = {};
  if (vault.gemini.trim()) headers["X-Gemini-Key"] = vault.gemini.trim();
  if (vault.openai.trim()) headers["X-OpenAI-Key"] = vault.openai.trim();
  if (vault.anthropic.trim()) headers["X-Anthropic-Key"] = vault.anthropic.trim();
  if (vault.xai.trim()) headers["X-XAI-Key"] = vault.xai.trim();
  if (vault.elevenlabs.trim()) headers["X-ElevenLabs-Key"] = vault.elevenlabs.trim();
  if (vault.higgsfield.trim()) headers["X-Higgsfield-Key"] = vault.higgsfield.trim();
  return headers;
}

export function resolveBackendAssetUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${BACKEND_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export async function fetchHealth(vault: ApiVaultState) {
  const res = await fetch(`${BACKEND_URL}/api/v1/health`, {
    headers: buildVaultHeaders(vault),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchEpisodes(): Promise<EpisodeManifest[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/episodes`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`);
  return res.json();
}

export async function produceEpisode(params: {
  prompt: string;
  llmProvider: LLMProvider;
  preferredProgram?: string;
  mediaFile?: File | null;
  vault: ApiVaultState;
}): Promise<EpisodeManifest> {
  const form = new FormData();
  form.append("prompt", params.prompt);
  form.append("llm_provider", params.llmProvider);
  if (params.preferredProgram) {
    form.append("preferred_program", params.preferredProgram);
  }
  if (params.vault.voiceId.trim()) {
    form.append("voice_id", params.vault.voiceId.trim());
  }
  if (params.mediaFile) {
    form.append("media_file", params.mediaFile);
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/produce`, {
    method: "POST",
    headers: buildVaultHeaders(params.vault),
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Produce failed (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function rerunAgentNode(params: {
  episodeId: string;
  agentId: string;
  customPrompt: string;
  llmProvider: LLMProvider;
  vault: ApiVaultState;
}): Promise<EpisodeManifest> {
  const res = await fetch(`${BACKEND_URL}/api/v1/rerun-node`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildVaultHeaders(params.vault),
    },
    body: JSON.stringify({
      episode_id: params.episodeId,
      agent_id: params.agentId,
      custom_prompt: params.customPrompt,
      llm_provider: params.llmProvider,
      voice_id: params.vault.voiceId || undefined,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Rerun node failed (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function bakeRigKeyframe(params: {
  episodeId: string;
  actNumber: number;
  rigKeyframe: RigKeyframe;
}): Promise<EpisodeManifest> {
  const res = await fetch(`${BACKEND_URL}/api/v1/bake-keyframe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      episode_id: params.episodeId,
      act_number: params.actNumber,
      rig_keyframe: params.rigKeyframe,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Bake keyframe failed (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function dispatchHiggsfield(params: {
  episodeId: string;
  actNumber: number;
  prompt: string;
  vault: ApiVaultState;
}) {
  const res = await fetch(`${BACKEND_URL}/api/v1/higgsfield/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildVaultHeaders(params.vault),
    },
    body: JSON.stringify({
      episode_id: params.episodeId,
      act_number: params.actNumber,
      prompt: params.prompt,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errData.detail || "Falha ao enviar para Higgsfield");
  }
  return res.json();
}
