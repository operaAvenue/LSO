from __future__ import annotations
from datetime import datetime, timezone
import json
import os
import re
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from blender_bridge import generate_blender_python_script
from media_pipeline import (
    AUDIO_DIR,
    MANIFESTS_DIR,
    OUTPUTS_DIR,
    UPLOADS_DIR,
    dispatch_higgsfield_generation,
    synchronize_episode_timeline,
    transcribe_media_with_whisper,
)
from orchestrator import (
    MARCUS_SYSTEM_PROMPT,
    MAYA_SYSTEM_PROMPT,
    VIKTOR_SYSTEM_PROMPT,
    VaultKeys,
    execute_tv_production_pipeline,
)
from schemas import (
    AgentExecutionTrace,
    BakeKeyframeRequest,
    EpisodeManifest,
    HiggsfieldDispatchRequest,
    LLMProvider,
    RerunNodeRequest,
    StudioProjectState,
)

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

ASSETS_DIR = OUTPUTS_DIR / "assets"
PROJECTS_DIR = OUTPUTS_DIR / "projects"
for d in (ASSETS_DIR, PROJECTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

SUPPORTED_ASSET_EXTENSIONS = {
    ".glb",
    ".gltf",
    ".obj",
    ".fbx",
    ".stl",
    ".dae",
    ".ply",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".svg",
}

app = FastAPI(
    title="AI-TV Studio Orchestrator API",
    version="2.5.0",
    description="Multi-Agent Generative TV Broadcast Orchestrator + 3D/2D Studio Editor + Multi-Format 3D Importer + Character Builder",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


def _extract_vault_keys(
    x_gemini_key: Optional[str],
    x_openai_key: Optional[str],
    x_anthropic_key: Optional[str],
    x_xai_key: Optional[str],
    x_elevenlabs_key: Optional[str],
    x_higgsfield_key: Optional[str],
) -> VaultKeys:
    return VaultKeys(
        gemini=x_gemini_key,
        openai=x_openai_key,
        anthropic=x_anthropic_key,
        xai=x_xai_key,
        elevenlabs=x_elevenlabs_key,
        higgsfield=x_higgsfield_key,
    )


def _save_manifest(manifest: EpisodeManifest) -> Path:
    manifest_path = MANIFESTS_DIR / f"{manifest.episode_id}.json"
    manifest_path.write_text(
        json.dumps(manifest.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest_path


def _load_manifest(episode_id: str) -> EpisodeManifest:
    manifest_path = MANIFESTS_DIR / f"{episode_id}.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail=f"Episódio '{episode_id}' não encontrado.")
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return EpisodeManifest.model_validate(data)


@app.get("/api/v1/health")
async def health_check(
    x_gemini_key: Optional[str] = Header(default=None),
    x_openai_key: Optional[str] = Header(default=None),
    x_anthropic_key: Optional[str] = Header(default=None),
    x_xai_key: Optional[str] = Header(default=None),
    x_elevenlabs_key: Optional[str] = Header(default=None),
    x_higgsfield_key: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    keys = _extract_vault_keys(
        x_gemini_key, x_openai_key, x_anthropic_key, x_xai_key, x_elevenlabs_key, x_higgsfield_key
    )
    return {
        "status": "online",
        "service": "AI-TV Studio Orchestrator",
        "version": "2.5.0",
        "providers": {
            "gemini": bool(keys.get_key(LLMProvider.GEMINI)),
            "chatgpt": bool(keys.get_key(LLMProvider.CHATGPT)),
            "claude": bool(keys.get_key(LLMProvider.CLAUDE)),
            "grok": bool(keys.get_key(LLMProvider.GROK)),
            "elevenlabs": bool(keys.elevenlabs or os.getenv("ELEVENLABS_API_KEY")),
            "higgsfield": bool(keys.higgsfield or os.getenv("HIGGSFIELD_API_KEY")),
        },
        "default_prompts": {
            "marcus": MARCUS_SYSTEM_PROMPT,
            "maya": MAYA_SYSTEM_PROMPT,
            "viktor": VIKTOR_SYSTEM_PROMPT,
        },
        "supported_3d_formats": ["glb", "gltf", "obj", "fbx", "stl", "dae", "ply"],
        "supported_2d_formats": ["png", "svg", "webp", "jpg"],
    }


@app.get("/api/v1/episodes", response_model=List[EpisodeManifest])
async def list_episodes() -> List[EpisodeManifest]:
    manifests: List[EpisodeManifest] = []
    for p in sorted(MANIFESTS_DIR.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
        try:
            manifests.append(EpisodeManifest.model_validate_json(p.read_text(encoding="utf-8")))
        except Exception:
            continue
    return manifests[:25]


@app.get("/api/v1/episodes/{episode_id}", response_model=EpisodeManifest)
async def get_episode(episode_id: str) -> EpisodeManifest:
    return _load_manifest(episode_id)


@app.post("/api/v1/produce", response_model=EpisodeManifest)
async def produce_episode(
    prompt: str = Form(..., description="Instrução criativa, pauta, link ou roteiro base"),
    llm_provider: LLMProvider = Form(default=LLMProvider.SQUAD_MODE),
    preferred_program: Optional[str] = Form(default=None),
    voice_id: Optional[str] = Form(default=None),
    media_file: Optional[UploadFile] = File(default=None),
    x_gemini_key: Optional[str] = Header(default=None),
    x_openai_key: Optional[str] = Header(default=None),
    x_anthropic_key: Optional[str] = Header(default=None),
    x_xai_key: Optional[str] = Header(default=None),
    x_elevenlabs_key: Optional[str] = Header(default=None),
    x_higgsfield_key: Optional[str] = Header(default=None),
) -> EpisodeManifest:
    keys = _extract_vault_keys(
        x_gemini_key, x_openai_key, x_anthropic_key, x_xai_key, x_elevenlabs_key, x_higgsfield_key
    )
    episode_id = f"ep_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    input_media_url: Optional[str] = None
    input_media_filename: Optional[str] = None
    input_transcript: Optional[str] = None

    if media_file and media_file.filename:
        safe_ext = Path(media_file.filename).suffix.lower() or ".bin"
        saved_name = f"{episode_id}_input{safe_ext}"
        saved_path = UPLOADS_DIR / saved_name
        content = await media_file.read()
        saved_path.write_bytes(content)
        input_media_url = f"/outputs/uploads/{saved_name}"
        input_media_filename = media_file.filename

        if safe_ext in {".mp4", ".mp3", ".wav", ".m4a", ".webm"}:
            input_transcript = await transcribe_media_with_whisper(
                media_path=saved_path,
                openai_key=keys.get_key(LLMProvider.CHATGPT),
            )

    marcus_out, maya_out, viktor_out, produced_acts, agent_traces = await execute_tv_production_pipeline(
        prompt=prompt,
        llm_mode=llm_provider,
        keys=keys,
        preferred_program=preferred_program,
        input_transcript=input_transcript,
        voice_id_override=voice_id,
    )

    t_audio = time.perf_counter()
    synchronized_acts, total_duration, audio_source = await synchronize_episode_timeline(
        episode_id=episode_id,
        acts=produced_acts,
        elevenlabs_key=keys.elevenlabs,
        voice_id_override=voice_id,
    )
    agent_traces.append(
        AgentExecutionTrace(
            agent_id="elevenlabs",
            agent_name="ElevenLabs Voice & Timeline Engine",
            agent_role="Síntese Vocal & Sincronia de Timecode (Mutagen MP3)",
            provider_used=audio_source,
            model_used="eleven_multilingual_v2" if audio_source == "elevenlabs_api" else "acoustic_formant_mp3",
            system_prompt="POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id} + mutagen.mp3.MP3 timecode sync",
            latency_ms=int((time.perf_counter() - t_audio) * 1000),
            status="completed",
            summary_output=f"{len(synchronized_acts)} arquivos .mp3 gerados em /outputs/audio | Duração total: {total_duration:.2f}s",
        )
    )

    manifest = EpisodeManifest(
        episode_id=episode_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        episode_title=marcus_out.episode_title,
        breaking_chyron=marcus_out.breaking_chyron,
        selected_program=marcus_out.selected_program,
        editorial_thesis=marcus_out.editorial_thesis,
        viral_headline=maya_out.viral_headline,
        hashtags=maya_out.hashtags,
        visual_mode_recommendation=marcus_out.visual_mode_recommendation,
        studio_lighting_setup=viktor_out.studio_lighting_setup,
        llm_mode=llm_provider,
        input_media_url=input_media_url,
        input_media_filename=input_media_filename,
        input_transcript=input_transcript,
        total_duration_seconds=total_duration,
        acts=synchronized_acts,
        agent_traces=agent_traces,
        manifest_url=f"/outputs/manifests/{episode_id}.json",
    )

    _save_manifest(manifest)
    return manifest


@app.post("/api/v1/rerun-node", response_model=EpisodeManifest)
async def rerun_agent_node(
    req: RerunNodeRequest,
    x_gemini_key: Optional[str] = Header(default=None),
    x_openai_key: Optional[str] = Header(default=None),
    x_anthropic_key: Optional[str] = Header(default=None),
    x_xai_key: Optional[str] = Header(default=None),
    x_elevenlabs_key: Optional[str] = Header(default=None),
    x_higgsfield_key: Optional[str] = Header(default=None),
) -> EpisodeManifest:
    existing = _load_manifest(req.episode_id)
    keys = _extract_vault_keys(
        x_gemini_key, x_openai_key, x_anthropic_key, x_xai_key, x_elevenlabs_key, x_higgsfield_key
    )

    custom_prompts: Dict[str, str] = {}
    for trace in existing.agent_traces:
        if trace.agent_id in {"marcus", "maya", "viktor"}:
            custom_prompts[trace.agent_id] = trace.system_prompt
    custom_prompts[req.agent_id] = req.custom_prompt

    base_prompt = f"{existing.episode_title} — {existing.editorial_thesis}"
    if req.agent_id == "elevenlabs":
        synchronized_acts, total_duration, audio_source = await synchronize_episode_timeline(
            episode_id=existing.episode_id,
            acts=existing.acts,
            elevenlabs_key=keys.elevenlabs,
            voice_id_override=req.voice_id,
        )
        existing.acts = synchronized_acts
        existing.total_duration_seconds = total_duration
        _save_manifest(existing)
        return existing

    marcus_out, maya_out, viktor_out, produced_acts, agent_traces = await execute_tv_production_pipeline(
        prompt=base_prompt,
        llm_mode=req.llm_provider,
        keys=keys,
        preferred_program=existing.selected_program.value,
        input_transcript=existing.input_transcript,
        custom_agent_prompts=custom_prompts,
        voice_id_override=req.voice_id,
    )

    synchronized_acts, total_duration, audio_source = await synchronize_episode_timeline(
        episode_id=existing.episode_id,
        acts=produced_acts,
        elevenlabs_key=keys.elevenlabs,
        voice_id_override=req.voice_id,
    )

    agent_traces.append(
        AgentExecutionTrace(
            agent_id="elevenlabs",
            agent_name="ElevenLabs Voice & Timeline Engine",
            agent_role="Síntese Vocal & Sincronia de Timecode (Mutagen MP3)",
            provider_used=audio_source,
            model_used="eleven_multilingual_v2" if audio_source == "elevenlabs_api" else "acoustic_formant_mp3",
            system_prompt="POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id} + mutagen.mp3.MP3 timecode sync",
            latency_ms=120,
            status="completed",
            summary_output=f"Reprocessado a partir do node '{req.agent_id}' | Duração: {total_duration:.2f}s",
        )
    )

    updated = EpisodeManifest(
        episode_id=existing.episode_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        episode_title=marcus_out.episode_title,
        breaking_chyron=marcus_out.breaking_chyron,
        selected_program=marcus_out.selected_program,
        editorial_thesis=marcus_out.editorial_thesis,
        viral_headline=maya_out.viral_headline,
        hashtags=maya_out.hashtags,
        visual_mode_recommendation=marcus_out.visual_mode_recommendation,
        studio_lighting_setup=viktor_out.studio_lighting_setup,
        llm_mode=req.llm_provider,
        input_media_url=existing.input_media_url,
        input_media_filename=existing.input_media_filename,
        input_transcript=existing.input_transcript,
        total_duration_seconds=total_duration,
        acts=synchronized_acts,
        agent_traces=agent_traces,
        manifest_url=existing.manifest_url,
    )
    _save_manifest(updated)
    return updated


@app.post("/api/v1/bake-keyframe", response_model=EpisodeManifest)
async def bake_rig_keyframe(req: BakeKeyframeRequest) -> EpisodeManifest:
    manifest = _load_manifest(req.episode_id)
    found = False
    for act in manifest.acts:
        if act.act_number == req.act_number:
            act.rig_keyframe = req.rig_keyframe
            found = True
            break
    if not found and manifest.acts:
        manifest.acts[0].rig_keyframe = req.rig_keyframe
    _save_manifest(manifest)
    return manifest


@app.post("/api/v1/higgsfield/dispatch")
async def trigger_higgsfield_webhook(
    req: HiggsfieldDispatchRequest,
    x_higgsfield_key: Optional[str] = Header(default=None),
    x_higgsfield_webhook: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    manifest = _load_manifest(req.episode_id)
    try:
        result = await dispatch_higgsfield_generation(
            prompt=req.prompt,
            episode_id=req.episode_id,
            act_number=req.act_number,
            higgsfield_key=x_higgsfield_key,
            webhook_url=x_higgsfield_webhook,
        )
        for act in manifest.acts:
            if act.act_number == req.act_number:
                act.higgsfield_job_id = result["job_id"]
                act.higgsfield_status = result["status"]
        _save_manifest(manifest)
        return {"ok": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v1/episodes/{episode_id}/blender-script", response_class=PlainTextResponse)
async def export_blender_script(episode_id: str) -> PlainTextResponse:
    manifest = _load_manifest(episode_id)
    script_code = generate_blender_python_script(manifest)
    headers = {
        "Content-Disposition": f'attachment; filename="blender_bridge_{episode_id}.py"'
    }
    return PlainTextResponse(content=script_code, headers=headers)


# ============================================================================
# 3D / 2D ASSET IMPORTER & STUDIO SCENE PROJECT PERSISTENCE ENDPOINTS
# ============================================================================

@app.post("/api/v1/assets/upload")
async def upload_studio_asset(file: UploadFile = File(...)) -> Dict[str, object]:
    """
    Uploads a 3D model (.glb, .gltf, .obj, .fbx, .stl, .dae, .ply) or 2D cutout sprite
    (.png, .svg, .webp, .jpg) to backend/outputs/assets/ for use in the Studio Scene Editor.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_ASSET_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato '{ext}' não suportado. Use: {', '.join(sorted(SUPPORTED_ASSET_EXTENSIONS))}",
        )
    clean_stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(file.filename).stem)[:60]
    asset_id = f"asset_{uuid.uuid4().hex[:8]}"
    saved_filename = f"{asset_id}_{clean_stem}{ext}"
    saved_path = ASSETS_DIR / saved_filename
    raw_bytes = await file.read()
    saved_path.write_bytes(raw_bytes)

    return {
        "id": asset_id,
        "name": file.filename,
        "format": ext.lstrip("."),
        "url": f"/outputs/assets/{saved_filename}",
        "size_bytes": len(raw_bytes),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/assets")
async def list_studio_assets() -> List[Dict[str, object]]:
    assets: List[Dict[str, object]] = []
    for p in sorted(ASSETS_DIR.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True):
        if p.is_file() and p.suffix.lower() in SUPPORTED_ASSET_EXTENSIONS:
            assets.append(
                {
                    "id": p.stem.split("_")[0] + "_" + p.stem.split("_")[1] if "_" in p.stem else p.stem,
                    "name": p.name,
                    "format": p.suffix.lower().lstrip("."),
                    "url": f"/outputs/assets/{p.name}",
                    "size_bytes": p.stat().st_size,
                }
            )
    return assets


@app.post("/api/v1/projects", response_model=StudioProjectState)
async def save_studio_project(project: StudioProjectState) -> StudioProjectState:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", project.project_id or f"proj_{uuid.uuid4().hex[:8]}")[:70]
    project.project_id = safe_id
    project.updated_at = datetime.now(timezone.utc).isoformat()
    target = PROJECTS_DIR / f"{safe_id}.json"
    target.write_text(
        json.dumps(project.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return project


@app.get("/api/v1/projects", response_model=List[StudioProjectState])
async def list_studio_projects() -> List[StudioProjectState]:
    projects: List[StudioProjectState] = []
    for p in sorted(PROJECTS_DIR.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True):
        try:
            projects.append(StudioProjectState.model_validate_json(p.read_text(encoding="utf-8")))
        except Exception:
            continue
    return projects[:40]


@app.get("/api/v1/projects/{project_id}", response_model=StudioProjectState)
async def get_studio_project(project_id: str) -> StudioProjectState:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", project_id)[:70]
    target = PROJECTS_DIR / f"{safe_id}.json"
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Projeto '{project_id}' não encontrado.")
    return StudioProjectState.model_validate_json(target.read_text(encoding="utf-8"))


@app.delete("/api/v1/projects/{project_id}")
async def delete_studio_project(project_id: str) -> Dict[str, bool]:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", project_id)[:70]
    target = PROJECTS_DIR / f"{safe_id}.json"
    target.unlink(missing_ok=True)
    return {"deleted": True}
