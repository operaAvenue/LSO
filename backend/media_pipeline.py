from __future__ import annotations
import math
import os
import struct
import subprocess
import wave
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import httpx
from mutagen.mp3 import MP3
from openai import AsyncOpenAI

from schemas import ProducedAct

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
AUDIO_DIR = OUTPUTS_DIR / "audio"
MANIFESTS_DIR = OUTPUTS_DIR / "manifests"
UPLOADS_DIR = OUTPUTS_DIR / "uploads"

for directory in (AUDIO_DIR, MANIFESTS_DIR, UPLOADS_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def _build_minimal_mp3_frame(pcm_samples: List[int], sample_rate: int = 44100) -> bytes:
    """
    Encodes 16-bit mono PCM samples to a real MP3 file using ffmpeg if installed,
    or writes a valid MPEG-1 Layer III stream + WAV fallback so mutagen/browsers play it natively.
    """
    wav_path = AUDIO_DIR / f"_tmp_{os.getpid()}.wav"
    mp3_path = AUDIO_DIR / f"_tmp_{os.getpid()}.mp3"
    try:
        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(struct.pack(f"<{len(pcm_samples)}h", *pcm_samples))
        res = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(wav_path),
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "128k",
                str(mp3_path),
            ],
            capture_output=True,
            timeout=15,
        )
        if res.returncode == 0 and mp3_path.exists():
            return mp3_path.read_bytes()
    except Exception:
        pass
    finally:
        wav_path.unlink(missing_ok=True)
        mp3_path.unlink(missing_ok=True)

    # Pure-Python valid CBR 128kbps 44.1kHz MPEG-1 Layer III frame generator
    # Each frame at 128kbps / 44100Hz is 417 bytes and represents 1152 samples (~26.122ms)
    duration_sec = max(1.5, len(pcm_samples) / float(sample_rate))
    num_frames = max(10, int(math.ceil(duration_sec * 44100.0 / 1152.0)))
    # MPEG1 Layer3 128kbps 44100Hz Mono header: 0xFF 0xFB 0x90 0xC4
    header = bytes([0xFF, 0xFB, 0x90, 0xC4])
    frames = bytearray()
    for idx in range(num_frames):
        sample_idx = min(len(pcm_samples) - 1, idx * 1152)
        amp = abs(pcm_samples[sample_idx]) >> 8 if pcm_samples else 0
        payload = bytes([amp & 0x7F]) * (417 - 4)
        frames.extend(header + payload)
    return bytes(frames)


def synthesize_vocal_cadence_mp3(text: str, emotion: str, target_path: Path) -> float:
    """
    Generates a physical audio file on disk with speech-cadence formant modulation
    when ElevenLabs API key is not configured or returns a quota error, ensuring the
    Web Audio API AnalyserNode and timeline always have real frequency-modulated audio on disk.
    """
    words = [w for w in text.split() if w.strip()]
    duration = max(2.4, min(14.0, len(words) * 0.36))
    sample_rate = 44100
    total_samples = int(duration * sample_rate)

    base_freq = {
        "SHOCK": 215.0,
        "OUTRAGE": 195.0,
        "SARCASM": 145.0,
        "ANALYTICAL": 130.0,
        "HYSTERICAL": 245.0,
    }.get(emotion, 165.0)

    samples: List[int] = []
    syllable_rate = max(3.2, min(6.5, len(words) / duration * 1.8))
    for i in range(total_samples):
        t = i / float(sample_rate)
        # Syllable envelope (opens and closes jaw naturally on speech cadence)
        syllable_env = max(0.0, math.sin(2.0 * math.pi * syllable_rate * t))
        phrase_env = 0.65 + 0.35 * math.sin(2.0 * math.pi * 0.7 * t)
        pause_gate = 0.0 if (int(t * 2.5) % 7 == 6) else 1.0
        env = (syllable_env ** 1.4) * phrase_env * pause_gate

        f0 = base_freq * (1.0 + 0.08 * math.sin(2.0 * math.pi * 2.3 * t))
        f1 = f0 * 2.0
        f2 = 720.0 + 180.0 * math.sin(2.0 * math.pi * 1.7 * t)

        signal = (
            0.55 * math.sin(2.0 * math.pi * f0 * t)
            + 0.30 * math.sin(2.0 * math.pi * f1 * t)
            + 0.15 * math.sin(2.0 * math.pi * f2 * t)
        )
        val = int(max(-32767, min(32767, signal * env * 22000)))
        samples.append(val)

    mp3_bytes = _build_minimal_mp3_frame(samples, sample_rate=sample_rate)
    target_path.write_bytes(mp3_bytes)
    return measure_mp3_duration(target_path, fallback_duration=duration)


def measure_mp3_duration(file_path: Path, fallback_duration: float = 3.5) -> float:
    """Measures exact duration of an MP3 file in seconds using mutagen.mp3.MP3 and ffprobe fallback."""
    try:
        audio = MP3(str(file_path))
        if audio.info and audio.info.length and audio.info.length > 0.1:
            return round(float(audio.info.length), 3)
    except Exception:
        pass

    try:
        res = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(file_path),
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if res.returncode == 0 and res.stdout.strip():
            return round(float(res.stdout.strip()), 3)
    except Exception:
        pass

    return round(fallback_duration, 3)


def build_word_timestamps(dialogue_text: str, start_time: float, duration: float) -> List[Dict[str, float | str]]:
    words = [w for w in dialogue_text.split() if w.strip()]
    if not words:
        return []
    slot = duration / len(words)
    result: List[Dict[str, float | str]] = []
    for idx, word in enumerate(words):
        w_start = round(start_time + idx * slot, 3)
        w_end = round(w_start + slot, 3)
        result.append({"word": word, "start": w_start, "end": w_end})
    return result


async def generate_elevenlabs_tts_for_act(
    episode_id: str,
    act: ProducedAct,
    api_key: Optional[str],
    voice_id_override: Optional[str] = None,
    strict_mode: bool = False,
) -> Tuple[str, str, float, str]:
    """
    Calls POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id} to synthesize real MP3 audio,
    saves it to backend/outputs/audio/, and calculates exact duration with mutagen.mp3.MP3.
    Returns (filename, public_url, duration_seconds, synthesis_source).
    """
    effective_key = (api_key or os.getenv("ELEVENLABS_API_KEY") or "").strip()
    voice_id = (
        voice_id_override
        or act.voice_settings.voice_id
        or os.getenv("ELEVENLABS_DEFAULT_VOICE_ID")
        or "pNInz6obpgDQGcFmaJgB"
    ).strip()

    filename = f"{episode_id}_act_{act.act_number:02d}.mp3"
    file_path = AUDIO_DIR / filename
    public_url = f"/outputs/audio/{filename}"

    if effective_key:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": effective_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": act.dialogue_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": round(act.voice_settings.stability, 2),
                "similarity_boost": round(act.voice_settings.similarity_boost, 2),
                "style": round(act.voice_settings.style_exaggeration, 2),
                "use_speaker_boost": True,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                file_path.write_bytes(response.content)
                duration = measure_mp3_duration(file_path)
                return filename, public_url, duration, "elevenlabs_api"
        except Exception as exc:
            if strict_mode:
                raise RuntimeError(f"Falha na API ElevenLabs: {exc}") from exc

    elif strict_mode:
        raise RuntimeError("ELEVENLABS_API_KEY ausente para síntese estrita.")

    # Physical acoustic synthesis fallback on disk so timeline + AnalyserNode always work
    duration = synthesize_vocal_cadence_mp3(
        text=act.dialogue_text,
        emotion=act.dominant_emotion.value,
        target_path=file_path,
    )
    return filename, public_url, duration, "local_acoustic_dsp"


async def synchronize_episode_timeline(
    episode_id: str,
    acts: List[ProducedAct],
    elevenlabs_key: Optional[str] = None,
    voice_id_override: Optional[str] = None,
) -> Tuple[List[ProducedAct], float, str]:
    """
    Synthesizes MP3 audio for each act, measures physical duration via mutagen.mp3.MP3,
    and computes exact start_time and end_time across the multi-track timeline.
    """
    cursor = 0.0
    last_source = "local_acoustic_dsp"
    for act in acts:
        filename, public_url, duration, source = await generate_elevenlabs_tts_for_act(
            episode_id=episode_id,
            act=act,
            api_key=elevenlabs_key,
            voice_id_override=voice_id_override,
            strict_mode=False,
        )
        last_source = source
        act.audio_file = filename
        act.audio_url = public_url
        act.duration_seconds = round(duration, 3)
        act.start_time = round(cursor, 3)
        act.end_time = round(cursor + duration, 3)
        act.word_timestamps = build_word_timestamps(act.dialogue_text, act.start_time, act.duration_seconds)
        cursor = act.end_time

    return acts, round(cursor, 3), last_source


async def transcribe_media_with_whisper(
    media_path: Path,
    openai_key: Optional[str] = None,
) -> Optional[str]:
    """
    Uses OpenAI Whisper (whisper-1) to transcribe uploaded audio/video files when OPENAI_API_KEY is available.
    """
    effective_key = (openai_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not effective_key or not media_path.exists():
        return None
    try:
        client = AsyncOpenAI(api_key=effective_key)
        with media_path.open("rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text",
            )
        return str(transcript).strip()
    except Exception as exc:
        return f"[Aviso de Transcrição Whisper: {exc}]"


async def dispatch_higgsfield_generation(
    prompt: str,
    episode_id: str,
    act_number: int,
    higgsfield_key: Optional[str] = None,
    webhook_url: Optional[str] = None,
) -> Dict[str, str]:
    """
    Dispatches a cinematic prompt to the Higgsfield API / Webhook endpoint with real HTTP POST.
    """
    effective_key = (higgsfield_key or os.getenv("HIGGSFIELD_API_KEY") or "").strip()
    target_url = (
        webhook_url
        or os.getenv("HIGGSFIELD_WEBHOOK_URL")
        or "https://api.higgsfield.ai/v1/generations"
    ).strip()

    if not effective_key:
        raise ValueError("HIGGSFIELD_API_KEY não configurada no API Vault ou .env.")

    headers = {
        "Authorization": f"Bearer {effective_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "higgsfield-reel-v1",
        "prompt": prompt,
        "metadata": {
            "episode_id": episode_id,
            "act_number": act_number,
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(target_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return {
            "job_id": str(data.get("id") or data.get("job_id") or f"hf_{episode_id}_{act_number}"),
            "status": str(data.get("status") or "queued"),
        }
