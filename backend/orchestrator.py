from __future__ import annotations
import json
import os
import time
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar

from anthropic import AsyncAnthropic
from google import genai
from google.genai import types as genai_types
from openai import AsyncOpenAI
from pydantic import BaseModel

from schemas import (
    AgentExecutionTrace,
    EmotionType,
    InterpolationCurve,
    LLMProvider,
    MarcusDirectorOutput,
    MayaActScript,
    MayaViralOutput,
    ProducedAct,
    RigKeyframe,
    TVProgramType,
    ViktorActDirection,
    ViktorCinematographyOutput,
    VoiceSettings,
)

T = TypeVar("T", bound=BaseModel)

MARCUS_SYSTEM_PROMPT = """Você é MARCUS VANCE, Diretor Executivo de Workflow & Grade de TV de uma emissora generativa AAA.
Analise o material recebido (texto, pauta, transcrição de vídeo/áudio) e decida:
1. Qual programa da grade produzirá o episódio:
   - "Plantão Neural 24h" (política, economia, hard news urgente, breaking news)
   - "Choque de Cortiça" (sátira ácida, humor absurdo estilo South Park paper-cutout)
   - "Mesa Redonda Viral" (debates polarizados, cortes de podcast, confronto de ideias)
   - "Dossiê Hiper-Real" (investigação profunda, ciência, tecnologia, documentário cinematográfico)
2. Tese editorial afiada, gancho de audiência, recomendação visual ("3D" ou "2D_SOUTHPARK"), título de impacto e chyron de plantão.
Retorne estritamente no schema JSON solicitado."""

MAYA_SYSTEM_PROMPT = """Você é MAYA LIN, Engenheira Chefe de Conteúdo Viral & Retenção Social.
Com base na direção de Marcus Vance e no material de entrada, escreva os atos do programa:
- Cada ato DEVE ter um gancho de retenção explosivo nos primeiros 2 segundos (retention_hook_2s).
- Diálogos naturais de TV em português brasileiro, prontos para locução na ElevenLabs.
- Defina a emoção dominante de cada ato entre: SHOCK, OUTRAGE, SARCASM, ANALYTICAL, HYSTERICAL.
- Calibre stability (0.20 a 0.85) e style_exaggeration (0.30 a 0.95) de acordo com a intensidade dramática.
Retorne estritamente no schema JSON solicitado."""

VIKTOR_SYSTEM_PROMPT = """Você é VIKTOR K., Diretor Técnico de Rigs 3D/2D & Cinematografia Higgsfield.
Para cada ato escrito por Maya Lin, gere:
1. higgsfield_cinematic_prompt: Prompt técnico em INGLÊS para o motor Higgsfield especificando lente (ex: 35mm anamorphic f/1.4, 85mm telephoto), movimento de câmera (dolly zoom, whip pan, Dutch angle push-in), iluminação (volumetric rim light, high-contrast newsroom key light) e micro-expressão facial.
2. rig_keyframe numérico exato:
   - head_pitch (-45 a 45), head_yaw (-60 a 60), torso_lean (-30 a 30)
   - left_arm_ik (0.0 a 1.0), right_arm_ik (0.0 a 1.0)
   - jaw_open (0.15 a 0.95), brow_raise (-1.0 a 1.0), camera_fov (24 a 75)
   - interpolation: STEP_SOUTHPARK (para Choque de Cortiça / 2D) ou CUBIC_BEZIER (para 3D Studio)
Retorne estritamente no schema JSON solicitado."""


class VaultKeys(BaseModel):
    gemini: Optional[str] = None
    openai: Optional[str] = None
    anthropic: Optional[str] = None
    xai: Optional[str] = None
    elevenlabs: Optional[str] = None
    higgsfield: Optional[str] = None

    def get_key(self, provider: LLMProvider) -> Optional[str]:
        if provider == LLMProvider.GEMINI:
            return (self.gemini or os.getenv("GEMINI_API_KEY") or "").strip() or None
        if provider == LLMProvider.CHATGPT:
            return (self.openai or os.getenv("OPENAI_API_KEY") or "").strip() or None
        if provider == LLMProvider.CLAUDE:
            return (self.anthropic or os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
        if provider == LLMProvider.GROK:
            return (self.xai or os.getenv("XAI_API_KEY") or "").strip() or None
        return None


async def _call_gemini_structured(
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
) -> Tuple[T, str]:
    client = genai.Client(api_key=api_key)
    model_name = "gemini-2.5-flash"
    response = await client.aio.models.generate_content(
        model=model_name,
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=schema_cls,
            temperature=0.65,
        ),
    )
    parsed = schema_cls.model_validate_json(response.text)
    return parsed, model_name


async def _call_openai_structured(
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    base_url: Optional[str] = None,
    model_name: str = "gpt-4o",
) -> Tuple[T, str]:
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    schema_json = json.dumps(schema_cls.model_json_schema(), ensure_ascii=False)
    completion = await client.chat.completions.create(
        model=model_name,
        temperature=0.65,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"{system_prompt}\n\nResponda APENAS com um objeto JSON válido seguindo estritamente este JSON Schema:\n{schema_json}",
            },
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = completion.choices[0].message.content or "{}"
    parsed = schema_cls.model_validate_json(raw)
    return parsed, model_name


async def _call_claude_structured(
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
) -> Tuple[T, str]:
    client = AsyncAnthropic(api_key=api_key)
    model_name = "claude-3-5-sonnet-latest"
    schema_json = json.dumps(schema_cls.model_json_schema(), ensure_ascii=False)
    msg = await client.messages.create(
        model=model_name,
        max_tokens=4096,
        temperature=0.65,
        system=f"{system_prompt}\n\nRetorne APENAS JSON puro sem blocos markdown, obedecendo a este JSON Schema:\n{schema_json}",
        messages=[{"role": "user", "content": user_prompt}],
    )
    text_block = msg.content[0].text.strip()
    if text_block.startswith("```"):
        text_block = text_block.strip("`").removeprefix("json").strip()
    parsed = schema_cls.model_validate_json(text_block)
    return parsed, model_name


async def run_structured_llm(
    provider: LLMProvider,
    keys: VaultKeys,
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
) -> Tuple[Optional[T], str, str]:
    """
    Executes structured LLM inference on the requested provider, falling back to any other
    configured provider key before using the local deterministic broadcast engine.
    Returns (parsed_model_or_None, provider_used, model_used).
    """
    candidate_order: List[LLMProvider] = [provider]
    for fallback_p in (LLMProvider.GEMINI, LLMProvider.CHATGPT, LLMProvider.CLAUDE, LLMProvider.GROK):
        if fallback_p not in candidate_order:
            candidate_order.append(fallback_p)

    for cand in candidate_order:
        key = keys.get_key(cand)
        if not key:
            continue
        try:
            if cand == LLMProvider.GEMINI:
                res, model = await _call_gemini_structured(key, system_prompt, user_prompt, schema_cls)
                return res, "gemini", model
            if cand == LLMProvider.CHATGPT:
                res, model = await _call_openai_structured(key, system_prompt, user_prompt, schema_cls, model_name="gpt-4o")
                return res, "chatgpt", model
            if cand == LLMProvider.CLAUDE:
                res, model = await _call_claude_structured(key, system_prompt, user_prompt, schema_cls)
                return res, "claude", model
            if cand == LLMProvider.GROK:
                res, model = await _call_openai_structured(
                    key,
                    system_prompt,
                    user_prompt,
                    schema_cls,
                    base_url="https://api.x.ai/v1",
                    model_name="grok-2-latest",
                )
                return res, "grok", model
        except Exception as exc:
            print(f"[Orchestrator] Aviso ao chamar {cand.value}: {exc}")
            continue

    return None, "local_neural_engine", "aitv-deterministic-v1"


def _fallback_marcus(prompt: str, preferred_program: Optional[str] = None) -> MarcusDirectorOutput:
    lower = prompt.lower()
    if preferred_program:
        try:
            selected = TVProgramType(preferred_program)
        except ValueError:
            selected = TVProgramType.PLANTAO_NEURAL_24H
    elif any(k in lower for k in ["south park", "sátira", "satira", "piada", "cortiça", "cortica", "meme", "absurdo"]):
        selected = TVProgramType.CHOQUE_DE_CORTICA
    elif any(k in lower for k in ["debate", "mesa", "podcast", "confronto", "polêmica", "polemica"]):
        selected = TVProgramType.MESA_REDONDA_VIRAL
    elif any(k in lower for k in ["dossiê", "dossie", "documentário", "documentario", "história", "ciencia", "investigação"]):
        selected = TVProgramType.DOSSIE_HIPER_REAL
    else:
        selected = TVProgramType.PLANTAO_NEURAL_24H

    visual_mode = "2D_SOUTHPARK" if selected == TVProgramType.CHOQUE_DE_CORTICA else "3D"
    clean_topic = prompt.strip()[:90] if prompt.strip() else "A Revolução das Emissoras Autônomas por IA"

    return MarcusDirectorOutput(
        selected_program=selected,
        editorial_thesis=f"Cobertura de alto impacto sobre: {clean_topic}, contrastando velocidade algorítmica, choque cultural e bastidores.",
        target_audience_hook="Quem controla a narrativa quando a própria bancada de TV pensa em tempo real?",
        visual_mode_recommendation=visual_mode,
        act_count=4,
        episode_title=f"ESPECIAL: {clean_topic[:55].upper()}",
        breaking_chyron=f"URGENTE • {selected.value.upper()} • {clean_topic[:64].upper()}",
    )


def _fallback_maya(marcus: MarcusDirectorOutput, prompt: str) -> MayaViralOutput:
    topic = prompt.strip() or "a guerra invisível dos algoritmos nas redações de TV"
    short_topic = topic[:120]

    acts = [
        MayaActScript(
            act_number=1,
            speaker_name="Héctor Valadares",
            speaker_role="Âncora Chefe",
            retention_hook_2s="PARE TUDO AGORA! O que acabou de vazar muda a regra do jogo!",
            dialogue_text=f"Interrompemos a programação normal! Acaba de chegar na nossa bancada neural a confirmação sobre {short_topic}. Ninguém estava preparado para a velocidade desse impacto!",
            dominant_emotion=EmotionType.SHOCK,
            voice_stability=0.32,
            style_exaggeration=0.88,
            social_cut_caption="🚨 PLANTÃO: O vazamento que ninguém esperava!",
        ),
        MayaActScript(
            act_number=2,
            speaker_name="Maya Lin (Comentarista)",
            speaker_role="Analista de Conflito",
            retention_hook_2s="Eles juraram que isso era impossível há seis meses!",
            dialogue_text=f"Olha para os números na tela! Enquanto todo mundo olhava para o lado errado, {short_topic} redesenhou todo o tabuleiro nos bastidores sem pedir permissão!",
            dominant_emotion=EmotionType.OUTRAGE,
            voice_stability=0.38,
            style_exaggeration=0.82,
            social_cut_caption="🔥 BASTIDORES: O que esconderam de você!",
        ),
        MayaActScript(
            act_number=3,
            speaker_name="Dr. Arthur K.",
            speaker_role="Especialista Convidado",
            retention_hook_2s="Claro, porque confiar no plano oficial sempre deu super certo, né?",
            dialogue_text=f"É fascinante ver o pânico geral. Quando analisamos a estrutura técnica de {short_topic}, fica óbvio que o efeito cascata já começou e não tem botão de pausa.",
            dominant_emotion=EmotionType.SARCASM,
            voice_stability=0.58,
            style_exaggeration=0.68,
            social_cut_caption="🧠 ANÁLISE FRIA: O efeito cascata já começou.",
        ),
        MayaActScript(
            act_number=4,
            speaker_name="Héctor Valadares",
            speaker_role="Âncora Chefe",
            retention_hook_2s="A pergunta final que ninguém tem coragem de responder:",
            dialogue_text=f"O relógio está correndo ao vivo! Ou você entende como {short_topic} opera hoje, ou vira estatística no próximo boletim. Continue conectado!",
            dominant_emotion=EmotionType.ANALYTICAL,
            voice_stability=0.52,
            style_exaggeration=0.74,
            social_cut_caption="⚡ VEREDITO FINAL: O que acontece nas próximas 24h?",
        ),
    ]

    return MayaViralOutput(
        viral_headline=f"BOMBA NA GRADE: {marcus.episode_title}",
        hashtags=["#PlantaoNeural", "#AITVStudio", "#BreakingNews", "#CorteViral", "#Bastidores"],
        acts=acts,
    )


def _fallback_viktor(marcus: MarcusDirectorOutput, maya: MayaViralOutput) -> ViktorCinematographyOutput:
    interp = (
        InterpolationCurve.STEP_SOUTHPARK
        if marcus.visual_mode_recommendation == "2D_SOUTHPARK"
        else InterpolationCurve.CUBIC_BEZIER
    )

    presets = [
        (
            "35mm anamorphic lens f/1.8, rapid dolly push-in toward anchor desk, dramatic volumetric cyan and crimson newsroom rim lighting, widened eyes in sudden shock, ultra-detailed broadcast studio 8k",
            "Close-Up Impacto (35mm Dolly-In)",
            "Cyber Newsroom Crimson/Cyan",
            RigKeyframe(
                head_pitch=-8.0,
                head_yaw=12.0,
                torso_lean=10.0,
                left_arm_ik=0.65,
                right_arm_ik=0.45,
                jaw_open=0.78,
                brow_raise=0.85,
                camera_fov=34.0,
                interpolation=interp,
            ),
        ),
        (
            "50mm prime lens f/1.4, tense Dutch angle tracking shot, high-contrast tungsten key light with deep shadows, emphatic hand gesture slamming air, indignant facial micro-expression",
            "Dutch Angle Confronto (50mm)",
            "High-Contrast Tungsten",
            RigKeyframe(
                head_pitch=6.0,
                head_yaw=-24.0,
                torso_lean=16.0,
                left_arm_ik=0.88,
                right_arm_ik=0.82,
                jaw_open=0.84,
                brow_raise=-0.75,
                camera_fov=42.0,
                interpolation=interp,
            ),
        ),
        (
            "85mm portrait telephoto f/2.0, slow orbital arc around subject, moody cold steel-blue studio backlight, raised single eyebrow with sardonic half-smile, shallow depth of field",
            "Orbital Telephoto (85mm)",
            "Cold Steel Rim Light",
            RigKeyframe(
                head_pitch=-4.0,
                head_yaw=18.0,
                torso_lean=-8.0,
                left_arm_ik=0.25,
                right_arm_ik=0.58,
                jaw_open=0.48,
                brow_raise=0.45,
                camera_fov=28.0,
                interpolation=interp,
            ),
        ),
        (
            "24mm wide-angle broadcast crane pull-back revealing holographic telemetry wall, crisp dual-key studio illumination, authoritative forward lean into camera lens",
            "Wide Crane Finale (24mm)",
            "Full Broadcast Dual-Key",
            RigKeyframe(
                head_pitch=3.0,
                head_yaw=0.0,
                torso_lean=12.0,
                left_arm_ik=0.50,
                right_arm_ik=0.50,
                jaw_open=0.62,
                brow_raise=0.30,
                camera_fov=54.0,
                interpolation=interp,
            ),
        ),
    ]

    directions: List[ViktorActDirection] = []
    for idx, act in enumerate(maya.acts):
        p_prompt, shot_label, light_preset, kf = presets[idx % len(presets)]
        directions.append(
            ViktorActDirection(
                act_number=act.act_number,
                higgsfield_cinematic_prompt=f"{p_prompt} — Subject speaking with {act.dominant_emotion.value} intensity: '{act.retention_hook_2s}'",
                camera_shot_label=shot_label,
                lighting_preset=light_preset,
                rig_keyframe=kf,
            )
        )

    return ViktorCinematographyOutput(
        studio_lighting_setup="Tri-Point Broadcast Array + Volumetric LED Wall (5600K Key / Magenta-Cyan Rim)",
        render_engine_notes=f"Interpolação ativa: {interp.value} | Sincronizado com AnalyserNode FFT 256 bins",
        act_directions=directions,
    )


async def execute_tv_production_pipeline(
    prompt: str,
    llm_mode: LLMProvider,
    keys: VaultKeys,
    preferred_program: Optional[str] = None,
    input_transcript: Optional[str] = None,
    custom_agent_prompts: Optional[Dict[str, str]] = None,
    voice_id_override: Optional[str] = None,
) -> Tuple[MarcusDirectorOutput, MayaViralOutput, ViktorCinematographyOutput, List[ProducedAct], List[AgentExecutionTrace]]:
    """
    Executes the 3 AAA TV Agents sequentially:
      1. Marcus Vance (Director of Workflow & TV Grid)
      2. Maya Lin (Viral Content & Retention Engineer)
      3. Viktor K. (Technical Director of 3D/2D Rigs & Higgsfield Cinematography)
    In SQUAD_MODE, distributes agents across Gemini, Claude, and GPT-4o/Grok.
    """
    custom_prompts = custom_agent_prompts or {}
    combined_context = prompt.strip()
    if input_transcript:
        combined_context += f"\n\n[TRANSCRIÇÃO / MÍDIA DE ENTRADA]:\n{input_transcript}"
    if preferred_program:
        combined_context += f"\n\n[PROGRAMA PREFERIDO PELO USUÁRIO]: {preferred_program}"

    traces: List[AgentExecutionTrace] = []

    # 1. MARCUS VANCE
    t0 = time.perf_counter()
    marcus_provider = LLMProvider.GEMINI if llm_mode == LLMProvider.SQUAD_MODE else llm_mode
    marcus_sys = custom_prompts.get("marcus") or MARCUS_SYSTEM_PROMPT
    marcus_out, marcus_prov_used, marcus_model_used = await run_structured_llm(
        provider=marcus_provider,
        keys=keys,
        system_prompt=marcus_sys,
        user_prompt=f"PAUTA DE ENTRADA:\n{combined_context}",
        schema_cls=MarcusDirectorOutput,
    )
    if marcus_out is None:
        marcus_out = _fallback_marcus(combined_context, preferred_program=preferred_program)
    elif preferred_program:
        try:
            marcus_out.selected_program = TVProgramType(preferred_program)
            if marcus_out.selected_program == TVProgramType.CHOQUE_DE_CORTICA:
                marcus_out.visual_mode_recommendation = "2D_SOUTHPARK"
        except ValueError:
            pass

    traces.append(
        AgentExecutionTrace(
            agent_id="marcus",
            agent_name="Marcus Vance",
            agent_role="Diretor de Workflow & Grade de TV",
            provider_used=marcus_prov_used,
            model_used=marcus_model_used,
            system_prompt=marcus_sys,
            latency_ms=int((time.perf_counter() - t0) * 1000),
            status="completed",
            summary_output=f"Programa: {marcus_out.selected_program.value} | Modo: {marcus_out.visual_mode_recommendation} | {marcus_out.episode_title}",
        )
    )

    # 2. MAYA LIN
    t1 = time.perf_counter()
    maya_provider = LLMProvider.CLAUDE if llm_mode == LLMProvider.SQUAD_MODE else llm_mode
    maya_sys = custom_prompts.get("maya") or MAYA_SYSTEM_PROMPT
    maya_user_input = (
        f"DIREÇÃO DE MARCUS VANCE:\n{marcus_out.model_dump_json(indent=2)}\n\n"
        f"MATERIAL ORIGINAL:\n{combined_context}"
    )
    maya_out, maya_prov_used, maya_model_used = await run_structured_llm(
        provider=maya_provider,
        keys=keys,
        system_prompt=maya_sys,
        user_prompt=maya_user_input,
        schema_cls=MayaViralOutput,
    )
    if maya_out is None or not maya_out.acts:
        maya_out = _fallback_maya(marcus_out, combined_context)

    traces.append(
        AgentExecutionTrace(
            agent_id="maya",
            agent_name="Maya Lin",
            agent_role="Engenheira de Conteúdo Viral & Social",
            provider_used=maya_prov_used,
            model_used=maya_model_used,
            system_prompt=maya_sys,
            latency_ms=int((time.perf_counter() - t1) * 1000),
            status="completed",
            summary_output=f"{len(maya_out.acts)} atos roteirizados | Headline: {maya_out.viral_headline}",
        )
    )

    # 3. VIKTOR K.
    t2 = time.perf_counter()
    viktor_provider = LLMProvider.CHATGPT if llm_mode == LLMProvider.SQUAD_MODE else llm_mode
    viktor_sys = custom_prompts.get("viktor") or VIKTOR_SYSTEM_PROMPT
    viktor_user_input = (
        f"DIREÇÃO DE MARCUS:\n{marcus_out.model_dump_json(indent=2)}\n\n"
        f"ROTEIRO DE MAYA LIN:\n{maya_out.model_dump_json(indent=2)}"
    )
    viktor_out, viktor_prov_used, viktor_model_used = await run_structured_llm(
        provider=viktor_provider,
        keys=keys,
        system_prompt=viktor_sys,
        user_prompt=viktor_user_input,
        schema_cls=ViktorCinematographyOutput,
    )
    if viktor_out is None or not viktor_out.act_directions:
        viktor_out = _fallback_viktor(marcus_out, maya_out)

    traces.append(
        AgentExecutionTrace(
            agent_id="viktor",
            agent_name="Viktor K.",
            agent_role="Diretor Técnico de Rigs 3D/2D & Cinematografia Higgsfield",
            provider_used=viktor_prov_used,
            model_used=viktor_model_used,
            system_prompt=viktor_sys,
            latency_ms=int((time.perf_counter() - t2) * 1000),
            status="completed",
            summary_output=f"{len(viktor_out.act_directions)} keyframes IK/FK + prompts Higgsfield gerados ({viktor_out.studio_lighting_setup})",
        )
    )

    # Merge Maya acts + Viktor directions into ProducedActs
    dir_by_act = {d.act_number: d for d in viktor_out.act_directions}
    default_voice_id = (
        voice_id_override
        or os.getenv("ELEVENLABS_DEFAULT_VOICE_ID")
        or "pNInz6obpgDQGcFmaJgB"
    )
    produced_acts: List[ProducedAct] = []
    for idx, m_act in enumerate(maya_out.acts):
        v_dir = dir_by_act.get(m_act.act_number) or (
            viktor_out.act_directions[idx % len(viktor_out.act_directions)]
        )
        produced_acts.append(
            ProducedAct(
                act_number=m_act.act_number,
                speaker_name=m_act.speaker_name,
                speaker_role=m_act.speaker_role,
                retention_hook_2s=m_act.retention_hook_2s,
                dialogue_text=m_act.dialogue_text,
                dominant_emotion=m_act.dominant_emotion,
                social_cut_caption=m_act.social_cut_caption,
                voice_settings=VoiceSettings(
                    voice_id=default_voice_id,
                    stability=m_act.voice_stability,
                    similarity_boost=0.82,
                    style_exaggeration=m_act.style_exaggeration,
                ),
                higgsfield_prompt=v_dir.higgsfield_cinematic_prompt,
                camera_shot_label=v_dir.camera_shot_label,
                lighting_preset=v_dir.lighting_preset,
                rig_keyframe=v_dir.rig_keyframe,
            )
        )

    return marcus_out, maya_out, viktor_out, produced_acts, traces
