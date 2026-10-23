from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TVProgramType(str, Enum):
    PLANTAO_NEURAL_24H = "Plantão Neural 24h"
    CHOQUE_DE_CORTICA = "Choque de Cortiça"
    MESA_REDONDA_VIRAL = "Mesa Redonda Viral"
    DOSSIE_HIPER_REAL = "Dossiê Hiper-Real"


class LLMProvider(str, Enum):
    GEMINI = "gemini"
    CHATGPT = "chatgpt"
    CLAUDE = "claude"
    GROK = "grok"
    SQUAD_MODE = "squad_mode"


class EmotionType(str, Enum):
    SHOCK = "SHOCK"
    OUTRAGE = "OUTRAGE"
    SARCASM = "SARCASM"
    ANALYTICAL = "ANALYTICAL"
    HYSTERICAL = "HYSTERICAL"


class InterpolationCurve(str, Enum):
    STEP_SOUTHPARK = "STEP_SOUTHPARK"
    CUBIC_BEZIER = "CUBIC_BEZIER"


class RigKeyframe(BaseModel):
    head_pitch: float = Field(default=0.0, ge=-45.0, le=45.0, description="Rotação vertical da cabeça em graus")
    head_yaw: float = Field(default=0.0, ge=-60.0, le=60.0, description="Rotação horizontal da cabeça em graus")
    torso_lean: float = Field(default=0.0, ge=-30.0, le=30.0, description="Inclinação do tronco em graus")
    left_arm_ik: float = Field(default=0.2, ge=0.0, le=1.0, description="Elevação IK do braço esquerdo (0.0 a 1.0)")
    right_arm_ik: float = Field(default=0.2, ge=0.0, le=1.0, description="Elevação IK do braço direito (0.0 a 1.0)")
    jaw_open: float = Field(default=0.15, ge=0.0, le=1.0, description="Abertura base da mandíbula / boca South Park (0.0 a 1.0)")
    brow_raise: float = Field(default=0.0, ge=-1.0, le=1.0, description="Expressão das sobrancelhas (-1.0 franzida a 1.0 arqueada)")
    camera_fov: float = Field(default=42.0, ge=20.0, le=90.0, description="Campo de visão da câmera em graus")
    interpolation: InterpolationCurve = Field(default=InterpolationCurve.CUBIC_BEZIER)


class VoiceSettings(BaseModel):
    voice_id: str = Field(default="pNInz6obpgDQGcFmaJgB", description="ID da voz na ElevenLabs")
    stability: float = Field(default=0.45, ge=0.0, le=1.0)
    similarity_boost: float = Field(default=0.80, ge=0.0, le=1.0)
    style_exaggeration: float = Field(default=0.55, ge=0.0, le=1.0)


class MarcusDirectorOutput(BaseModel):
    selected_program: TVProgramType
    editorial_thesis: str
    target_audience_hook: str
    visual_mode_recommendation: str = Field(description="'3D' ou '2D_SOUTHPARK'")
    act_count: int = Field(default=4, ge=2, le=8)
    episode_title: str
    breaking_chyron: str


class MayaActScript(BaseModel):
    act_number: int
    speaker_name: str
    speaker_role: str
    retention_hook_2s: str
    dialogue_text: str
    dominant_emotion: EmotionType
    voice_stability: float = Field(ge=0.0, le=1.0)
    style_exaggeration: float = Field(ge=0.0, le=1.0)
    social_cut_caption: str


class MayaViralOutput(BaseModel):
    viral_headline: str
    hashtags: List[str]
    acts: List[MayaActScript]


class ViktorActDirection(BaseModel):
    act_number: int
    higgsfield_cinematic_prompt: str = Field(
        description="Prompt técnico em inglês especificando lente, movimento de câmera, iluminação e micro-expressão"
    )
    camera_shot_label: str
    lighting_preset: str
    rig_keyframe: RigKeyframe


class ViktorCinematographyOutput(BaseModel):
    studio_lighting_setup: str
    render_engine_notes: str
    act_directions: List[ViktorActDirection]


class ProducedAct(BaseModel):
    act_number: int
    speaker_name: str
    speaker_role: str
    retention_hook_2s: str
    dialogue_text: str
    dominant_emotion: EmotionType
    social_cut_caption: str
    voice_settings: VoiceSettings
    higgsfield_prompt: str
    camera_shot_label: str
    lighting_preset: str
    rig_keyframe: RigKeyframe
    audio_file: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: float = 4.0
    start_time: float = 0.0
    end_time: float = 4.0
    word_timestamps: List[Dict[str, float | str]] = Field(default_factory=list)
    higgsfield_job_id: Optional[str] = None
    higgsfield_status: Optional[str] = None


class AgentExecutionTrace(BaseModel):
    agent_id: str
    agent_name: str
    agent_role: str
    provider_used: str
    model_used: str
    system_prompt: str
    latency_ms: int
    status: str
    summary_output: str


class EpisodeManifest(BaseModel):
    episode_id: str
    created_at: str
    episode_title: str
    breaking_chyron: str
    selected_program: TVProgramType
    editorial_thesis: str
    viral_headline: str
    hashtags: List[str]
    visual_mode_recommendation: str
    studio_lighting_setup: str
    llm_mode: LLMProvider
    input_media_url: Optional[str] = None
    input_media_filename: Optional[str] = None
    input_transcript: Optional[str] = None
    total_duration_seconds: float
    acts: List[ProducedAct]
    agent_traces: List[AgentExecutionTrace]
    manifest_url: str


class RerunNodeRequest(BaseModel):
    episode_id: str
    agent_id: str
    custom_prompt: str
    llm_provider: LLMProvider = LLMProvider.GEMINI
    voice_id: Optional[str] = None


class BakeKeyframeRequest(BaseModel):
    episode_id: str
    act_number: int
    rig_keyframe: RigKeyframe


class HiggsfieldDispatchRequest(BaseModel):
    episode_id: str
    act_number: int
    prompt: str


# ============================================================================
# 3D & 2D STUDIO SCENE EDITOR, CHARACTER CREATOR, LAYERS & LIGHTING CONTRACTS
# ============================================================================

class StudioLayer(BaseModel):
    id: str
    name: str
    category: str = Field(default="scene", description="scene | characters | props | lights | overlays")
    visible: bool = True
    locked: bool = False
    color_tag: str = "#38bdf8"


class SceneObjectItem(BaseModel):
    id: str
    name: str
    layer_id: str = "layer_props"
    kind: str = Field(
        default="primitive",
        description="imported_model | anchor_desk | studio_camera | led_wall | teleprompter | sofa | plant | podium | truss | cube | cylinder | plane | sprite_2d",
    )
    format: Optional[str] = Field(default=None, description="glb | gltf | obj | fbx | stl | dae | ply | png | svg")
    asset_url: Optional[str] = None
    position: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    rotation: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    scale: List[float] = Field(default_factory=lambda: [1.0, 1.0, 1.0])
    color: str = "#1e293b"
    emissive: str = "#000000"
    emissive_intensity: float = 0.0
    metalness: float = 0.4
    roughness: float = 0.45
    cast_shadow: bool = True
    receive_shadow: bool = True
    visible: bool = True
    locked: bool = False


class CharacterSpec(BaseModel):
    id: str
    name: str
    role: str = "Âncora Principal"
    layer_id: str = "layer_characters"
    mode: str = Field(default="BOTH", description="3D | 2D_SOUTHPARK | BOTH")
    voice_id: str = "pNInz6obpgDQGcFmaJgB"
    position: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    rotation: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    scale: float = 1.0
    skin_color: str = "#ecc5a8"
    suit_color: str = "#1e293b"
    shirt_color: str = "#f8fafc"
    tie_color: str = "#00f0ff"
    hair_style: str = Field(default="executive", description="executive | spiky | curly | mohawk | bob | bald")
    hair_color: str = "#0f172a"
    hat_style: str = Field(default="none", description="none | beanie | cap | fedora | headphones | crown")
    hat_color: str = "#0ea5e9"
    glasses: bool = False
    glove_color: str = "#16a34a"
    eye_scale: float = 1.0
    custom_3d_model_url: Optional[str] = None
    custom_3d_format: Optional[str] = None
    custom_2d_head_url: Optional[str] = None
    custom_2d_body_url: Optional[str] = None
    visible: bool = True
    locked: bool = False
    is_active_speaker: bool = True


class StudioLightConfig(BaseModel):
    preset: str = "cyber_newsroom"
    ambient_intensity: float = 0.65
    ambient_color: str = "#ffffff"
    key_intensity: float = 2.2
    key_color: str = "#ffffff"
    key_position: List[float] = Field(default_factory=lambda: [2.5, 4.2, 3.5])
    fill_intensity: float = 1.4
    fill_color: str = "#38bdf8"
    fill_position: List[float] = Field(default_factory=lambda: [2.8, 1.8, -1.2])
    rim_intensity: float = 3.2
    rim_color: str = "#00f0ff"
    rim_position: List[float] = Field(default_factory=lambda: [-3.2, 3.0, -1.5])
    background_top: str = "#05070f"
    background_bottom: str = "#04060c"
    cyclorama_color: str = "#050814"
    fog_enabled: bool = True
    fog_color: str = "#05070f"
    fog_near: float = 5.0
    fog_far: float = 18.0


class CameraBookmark(BaseModel):
    id: str
    name: str
    position: List[float] = Field(default_factory=lambda: [0.0, 1.15, 3.35])
    target: List[float] = Field(default_factory=lambda: [0.0, 0.85, 0.0])
    fov: float = 42.0
    dutch_roll: float = 0.0


class ViewportQualityConfig(BaseModel):
    preset: str = Field(default="BALANCED", description="ULTRA_AAA | BALANCED | PERFORMANCE_60FPS | POTATO_LOW")
    dpr_min: float = 1.0
    dpr_max: float = 1.5
    shadows: bool = True
    shadow_map_size: int = 1024
    antialias: bool = True
    contact_shadows: bool = True
    wireframe_debug: bool = False
    show_grid: bool = True
    show_axes: bool = False
    show_light_helpers: bool = False


class StudioProjectState(BaseModel):
    project_id: str
    name: str
    updated_at: str
    selected_program: TVProgramType = TVProgramType.PLANTAO_NEURAL_24H
    render_stage_mode: str = "3D"
    layers: List[StudioLayer] = Field(default_factory=list)
    scene_objects: List[SceneObjectItem] = Field(default_factory=list)
    characters: List[CharacterSpec] = Field(default_factory=list)
    lighting: StudioLightConfig = Field(default_factory=StudioLightConfig)
    cameras: List[CameraBookmark] = Field(default_factory=list)
    active_camera_id: str = "cam_master"
    quality: ViewportQualityConfig = Field(default_factory=ViewportQualityConfig)
    active_episode_id: Optional[str] = None
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)
