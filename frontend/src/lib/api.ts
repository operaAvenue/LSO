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

// ============================================================================
// 3D & 2D STUDIO SCENE EDITOR, CHARACTER BUILDER, LAYERS & QUALITY TYPES
// ============================================================================

export interface StudioLayer {
  id: string;
  name: string;
  category: "scene" | "characters" | "props" | "lights" | "overlays";
  visible: boolean;
  locked: boolean;
  color_tag: string;
}

export type SceneObjectKind =
  | "imported_model"
  | "anchor_desk"
  | "studio_camera"
  | "led_wall"
  | "teleprompter"
  | "sofa"
  | "plant"
  | "podium"
  | "truss"
  | "cube"
  | "cylinder"
  | "plane"
  | "sprite_2d";

export interface SceneObjectItem {
  id: string;
  name: string;
  layer_id: string;
  kind: SceneObjectKind;
  format?: string | null; // glb | gltf | obj | fbx | stl | dae | ply | png | svg | webp
  asset_url?: string | null;
  position: [number, number, number];
  rotation: [number, number, number]; // degrees [x, y, z]
  scale: [number, number, number];
  color: string;
  emissive: string;
  emissive_intensity: number;
  metalness: number;
  roughness: number;
  cast_shadow: boolean;
  receive_shadow: boolean;
  visible: boolean;
  locked: boolean;
}

export interface CharacterSpec {
  id: string;
  name: string;
  role: string;
  layer_id: string;
  mode: "3D" | "2D_SOUTHPARK" | "BOTH";
  voice_id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  skin_color: string;
  suit_color: string;
  shirt_color: string;
  tie_color: string;
  hair_style: "executive" | "spiky" | "curly" | "mohawk" | "bob" | "bald";
  hair_color: string;
  hat_style: "none" | "beanie" | "cap" | "fedora" | "headphones" | "crown";
  hat_color: string;
  glasses: boolean;
  glove_color: string;
  eye_scale: number;
  custom_3d_model_url?: string | null;
  custom_3d_format?: string | null;
  custom_2d_head_url?: string | null;
  custom_2d_body_url?: string | null;
  visible: boolean;
  locked: boolean;
  is_active_speaker: boolean;
}

export interface StudioLightConfig {
  preset:
    | "cyber_newsroom"
    | "warm_talkshow"
    | "high_contrast_noir"
    | "chroma_green_screen"
    | "daylight_broadcast";
  ambient_intensity: number;
  ambient_color: string;
  key_intensity: number;
  key_color: string;
  key_position: [number, number, number];
  fill_intensity: number;
  fill_color: string;
  fill_position: [number, number, number];
  rim_intensity: number;
  rim_color: string;
  rim_position: [number, number, number];
  background_top: string;
  background_bottom: string;
  cyclorama_color: string;
  fog_enabled: boolean;
  fog_color: string;
  fog_near: number;
  fog_far: number;
}

export interface CameraBookmark {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  dutch_roll: number;
}

export interface ViewportQualityConfig {
  preset: "ULTRA_AAA" | "BALANCED" | "PERFORMANCE_60FPS" | "POTATO_LOW";
  dpr_min: number;
  dpr_max: number;
  shadows: boolean;
  shadow_map_size: 512 | 1024 | 2048;
  antialias: boolean;
  contact_shadows: boolean;
  wireframe_debug: boolean;
  show_grid: boolean;
  show_axes: boolean;
  show_light_helpers: boolean;
}

export interface StudioProjectState {
  project_id: string;
  name: string;
  updated_at: string;
  selected_program: TVProgramType;
  render_stage_mode: "3D" | "2D_SOUTHPARK";
  layers: StudioLayer[];
  scene_objects: SceneObjectItem[];
  characters: CharacterSpec[];
  lighting: StudioLightConfig;
  cameras: CameraBookmark[];
  active_camera_id: string;
  quality: ViewportQualityConfig;
  active_episode_id?: string | null;
  extra_metadata?: Record<string, unknown>;
}

export const DEFAULT_STUDIO_LAYERS: StudioLayer[] = [
  {
    id: "layer_scene",
    name: "Cenário & Arquitetura",
    category: "scene",
    visible: true,
    locked: false,
    color_tag: "#38bdf8",
  },
  {
    id: "layer_characters",
    name: "Personagens & Rigs",
    category: "characters",
    visible: true,
    locked: false,
    color_tag: "#a855f7",
  },
  {
    id: "layer_props",
    name: "Bancada, Câmeras & Props",
    category: "props",
    visible: true,
    locked: false,
    color_tag: "#10b981",
  },
  {
    id: "layer_overlays",
    name: "Recortes 2D & Sprites",
    category: "overlays",
    visible: true,
    locked: false,
    color_tag: "#f59e0b",
  },
];

export const DEFAULT_SCENE_OBJECTS: SceneObjectItem[] = [
  {
    id: "obj_anchor_desk",
    name: "Bancada Principal Telejornal",
    layer_id: "layer_props",
    kind: "anchor_desk",
    position: [0, 0.07, 0.72],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#0f172a",
    emissive: "#00f0ff",
    emissive_intensity: 1.8,
    metalness: 0.75,
    roughness: 0.22,
    cast_shadow: true,
    receive_shadow: true,
    visible: true,
    locked: false,
  },
  {
    id: "obj_led_wall",
    name: "Painel LED Curvo Cyclorama",
    layer_id: "layer_scene",
    kind: "led_wall",
    position: [0, 1.35, -2.2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#050814",
    emissive: "#0284c7",
    emissive_intensity: 0.9,
    metalness: 0.5,
    roughness: 0.55,
    cast_shadow: false,
    receive_shadow: true,
    visible: true,
    locked: false,
  },
  {
    id: "obj_pedestal_cam_left",
    name: "Câmera Pedestal Robótica 01",
    layer_id: "layer_props",
    kind: "studio_camera",
    position: [-2.1, -0.35, 1.65],
    rotation: [0, 32, 0],
    scale: [1, 1, 1],
    color: "#1e293b",
    emissive: "#ef4444",
    emissive_intensity: 1.5,
    metalness: 0.8,
    roughness: 0.25,
    cast_shadow: true,
    receive_shadow: true,
    visible: true,
    locked: false,
  },
  {
    id: "obj_truss_top",
    name: "Grid de Iluminação Aéreo (Truss)",
    layer_id: "layer_scene",
    kind: "truss",
    position: [0, 3.1, -0.3],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#334155",
    emissive: "#38bdf8",
    emissive_intensity: 0.4,
    metalness: 0.85,
    roughness: 0.2,
    cast_shadow: true,
    receive_shadow: false,
    visible: true,
    locked: false,
  },
];

export const DEFAULT_CHARACTERS: CharacterSpec[] = [
  {
    id: "char_hector",
    name: "Héctor Valadares",
    role: "Âncora Chefe",
    layer_id: "layer_characters",
    mode: "BOTH",
    voice_id: "pNInz6obpgDQGcFmaJgB",
    position: [0, -0.35, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
    skin_color: "#ecc5a8",
    suit_color: "#1e293b",
    shirt_color: "#f8fafc",
    tie_color: "#00f0ff",
    hair_style: "executive",
    hair_color: "#0f172a",
    hat_style: "none",
    hat_color: "#0ea5e9",
    glasses: false,
    glove_color: "#16a34a",
    eye_scale: 1.0,
    visible: true,
    locked: false,
    is_active_speaker: true,
  },
  {
    id: "char_maya",
    name: "Maya Lin (Comentarista)",
    role: "Analista Viral",
    layer_id: "layer_characters",
    mode: "BOTH",
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    position: [-1.15, -0.35, -0.15],
    rotation: [0, 18, 0],
    scale: 0.96,
    skin_color: "#f3d2b8",
    suit_color: "#581c87",
    shirt_color: "#fdf4ff",
    tie_color: "#f43f5e",
    hair_style: "bob",
    hair_color: "#1e1b4b",
    hat_style: "headphones",
    hat_color: "#ec4899",
    glasses: true,
    glove_color: "#9333ea",
    eye_scale: 1.05,
    visible: true,
    locked: false,
    is_active_speaker: false,
  },
];

export const DEFAULT_LIGHTING: StudioLightConfig = {
  preset: "cyber_newsroom",
  ambient_intensity: 0.65,
  ambient_color: "#ffffff",
  key_intensity: 2.2,
  key_color: "#ffffff",
  key_position: [2.5, 4.2, 3.5],
  fill_intensity: 1.5,
  fill_color: "#38bdf8",
  fill_position: [2.8, 1.8, -1.2],
  rim_intensity: 3.2,
  rim_color: "#00f0ff",
  rim_position: [-3.2, 3.0, -1.5],
  background_top: "#05070f",
  background_bottom: "#04060c",
  cyclorama_color: "#050814",
  fog_enabled: true,
  fog_color: "#05070f",
  fog_near: 6.0,
  fog_far: 19.0,
};

export const DEFAULT_CAMERAS: CameraBookmark[] = [
  {
    id: "cam_master",
    name: "CAM 01 • Wide Master (35mm)",
    position: [0, 1.18, 3.45],
    target: [0, 0.85, 0],
    fov: 42,
    dutch_roll: 0,
  },
  {
    id: "cam_closeup",
    name: "CAM 02 • Anchor Close-Up (85mm)",
    position: [0, 1.08, 1.95],
    target: [0, 0.98, 0],
    fov: 28,
    dutch_roll: 0,
  },
  {
    id: "cam_debate",
    name: "CAM 03 • Lateral Debate (50mm)",
    position: [-1.85, 1.15, 2.55],
    target: [-0.45, 0.88, 0],
    fov: 38,
    dutch_roll: -4,
  },
  {
    id: "cam_crane",
    name: "CAM 04 • Crane Top-Down (24mm)",
    position: [2.1, 2.65, 3.1],
    target: [0, 0.75, 0],
    fov: 54,
    dutch_roll: 0,
  },
];

export const DEFAULT_QUALITY: ViewportQualityConfig = {
  preset: "BALANCED",
  dpr_min: 1.0,
  dpr_max: 1.5,
  shadows: true,
  shadow_map_size: 1024,
  antialias: true,
  contact_shadows: true,
  wireframe_debug: false,
  show_grid: true,
  show_axes: false,
  show_light_helpers: false,
};

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
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) {
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

// ============================================================================
// STUDIO ASSETS & PROJECT PERSISTENCE API CALLS
// ============================================================================

export async function uploadStudioAsset(file: File): Promise<{
  id: string;
  name: string;
  format: string;
  url: string;
  size_bytes: number;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND_URL}/api/v1/assets/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Falha no upload do asset 3D/2D");
  }
  return res.json();
}

export async function fetchStudioAssets(): Promise<
  Array<{ id: string; name: string; format: string; url: string; size_bytes: number }>
> {
  const res = await fetch(`${BACKEND_URL}/api/v1/assets`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function saveStudioProject(
  project: StudioProjectState
): Promise<StudioProjectState> {
  const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao salvar projeto: ${err}`);
  }
  return res.json();
}

export async function fetchStudioProjects(): Promise<StudioProjectState[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/projects`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteStudioProject(projectId: string): Promise<void> {
  await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
    method: "DELETE",
  });
}
