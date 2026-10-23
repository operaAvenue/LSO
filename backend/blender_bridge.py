from __future__ import annotations
import json
from schemas import EpisodeManifest


def generate_blender_python_script(manifest: EpisodeManifest, backend_base_url: str = "http://localhost:8000") -> str:
    """
    Generates an executable Blender 4.x Python (bpy) script that imports the EpisodeManifest JSON,
    sets up the 3D Armature keyframes (head_pitch, head_yaw, torso_lean, left_arm_ik, right_arm_ik,
    jaw_open, brow_raise), configures camera FOV keyframes, and loads the ElevenLabs MP3 strips
    into the Blender Video Sequence Editor (VSE).
    """
    manifest_json_str = json.dumps(manifest.model_dump(mode="json"), ensure_ascii=False, indent=2)

    script = f'''#!/usr/bin/env python3
"""
AI-TV Studio Orchestrator — Blender 4.x Bridge Script (bpy)
Episódio: {manifest.episode_title} ({manifest.episode_id})
Programa: {manifest.selected_program.value}
Gerado automaticamente pelo Diretor Técnico Viktor K.

Como usar no Blender:
1. Abra o Blender 4.x -> aba Scripting -> New -> cole ou abra este arquivo .py
2. Certifique-se de que a pasta de áudios MP3 está acessível ou que o backend está rodando em {backend_base_url}
3. Clique em "Run Script" (Alt+P).
"""

import json
import math
import os
import tempfile
import urllib.request
import bpy

MANIFEST_DATA = json.loads(r"""{manifest_json_str}""")
BACKEND_BASE_URL = "{backend_base_url}"
FPS = 24


def ensure_scene_setup():
    scene = bpy.context.scene
    scene.render.fps = FPS
    total_frames = max(48, int(math.ceil(MANIFEST_DATA["total_duration_seconds"] * FPS)) + 24)
    scene.frame_start = 1
    scene.frame_end = total_frames
    if not scene.sequence_editor:
        scene.sequence_editor_create()
    return scene


def ensure_studio_camera(scene):
    cam_obj = bpy.data.objects.get("AITV_Studio_Camera")
    if not cam_obj:
        cam_data = bpy.data.cameras.new(name="AITV_Studio_Camera")
        cam_obj = bpy.data.objects.new("AITV_Studio_Camera", cam_data)
        scene.collection.objects.link(cam_obj)
        cam_obj.location = (0.0, -4.2, 1.55)
        cam_obj.rotation_euler = (math.radians(86.0), 0.0, 0.0)
    scene.camera = cam_obj
    return cam_obj


def ensure_anchor_armature(scene):
    arm_obj = bpy.data.objects.get("AITV_Anchor_Rig")
    if arm_obj:
        return arm_obj

    arm_data = bpy.data.armatures.new("AITV_Anchor_Armature")
    arm_obj = bpy.data.objects.new("AITV_Anchor_Rig", arm_data)
    scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    bones_spec = {{
        "torso": ((0.0, 0.0, 0.8), (0.0, 0.0, 1.35), None),
        "head": ((0.0, 0.0, 1.35), (0.0, 0.0, 1.68), "torso"),
        "jaw": ((0.0, -0.05, 1.42), (0.0, -0.18, 1.36), "head"),
        "brow": ((0.0, -0.12, 1.58), (0.0, -0.18, 1.58), "head"),
        "left_arm_ik": ((0.25, 0.0, 1.30), (0.65, -0.15, 0.95), "torso"),
        "right_arm_ik": ((-0.25, 0.0, 1.30), (-0.65, -0.15, 0.95), "torso"),
    }}

    created = {{}}
    for b_name, (head_pos, tail_pos, parent_name) in bones_spec.items():
        eb = arm_data.edit_bones.new(b_name)
        eb.head = head_pos
        eb.tail = tail_pos
        if parent_name and parent_name in created:
            eb.parent = created[parent_name]
        created[b_name] = eb

    bpy.ops.object.mode_set(mode="POSE")
    for pbone in arm_obj.pose.bones:
        pbone.rotation_mode = "XYZ"
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def apply_act_keyframes(scene, arm_obj, cam_obj):
    pose_bones = arm_obj.pose.bones
    audio_tmp_dir = tempfile.mkdtemp(prefix="aitv_audio_")

    for act in MANIFEST_DATA.get("acts", []):
        start_frame = max(1, int(round(act["start_time"] * FPS)) + 1)
        end_frame = max(start_frame + 2, int(round(act["end_time"] * FPS)))
        kf = act["rig_keyframe"]
        interp_mode = "CONSTANT" if kf.get("interpolation") == "STEP_SOUTHPARK" else "BEZIER"

        scene.frame_set(start_frame)

        # Head pitch & yaw
        head_pb = pose_bones.get("head")
        if head_pb:
            head_pb.rotation_euler = (
                math.radians(float(kf["head_pitch"])),
                0.0,
                math.radians(float(kf["head_yaw"])),
            )
            head_pb.keyframe_insert(data_path="rotation_euler", frame=start_frame)

        # Torso lean
        torso_pb = pose_bones.get("torso")
        if torso_pb:
            torso_pb.rotation_euler = (math.radians(float(kf["torso_lean"])), 0.0, 0.0)
            torso_pb.keyframe_insert(data_path="rotation_euler", frame=start_frame)

        # Arms IK elevation
        l_arm = pose_bones.get("left_arm_ik")
        if l_arm:
            l_arm.rotation_euler = (math.radians(-float(kf["left_arm_ik"]) * 75.0), 0.0, 0.0)
            l_arm.keyframe_insert(data_path="rotation_euler", frame=start_frame)

        r_arm = pose_bones.get("right_arm_ik")
        if r_arm:
            r_arm.rotation_euler = (math.radians(-float(kf["right_arm_ik"]) * 75.0), 0.0, 0.0)
            r_arm.keyframe_insert(data_path="rotation_euler", frame=start_frame)

        # Jaw open cadence keyframes across the act
        jaw_pb = pose_bones.get("jaw")
        if jaw_pb:
            base_jaw = float(kf["jaw_open"])
            step = 2 if interp_mode == "CONSTANT" else 3
            for f in range(start_frame, end_frame, step):
                phase = ((f - start_frame) % (step * 2)) / float(step * 2)
                open_amt = base_jaw if phase < 0.5 else base_jaw * 0.15
                jaw_pb.rotation_euler = (math.radians(open_amt * 32.0), 0.0, 0.0)
                jaw_pb.keyframe_insert(data_path="rotation_euler", frame=f)

        # Brow raise
        brow_pb = pose_bones.get("brow")
        if brow_pb:
            brow_pb.location = (0.0, 0.0, float(kf["brow_raise"]) * 0.04)
            brow_pb.keyframe_insert(data_path="location", frame=start_frame)

        # Camera FOV
        fov_rad = math.radians(float(kf["camera_fov"]))
        cam_obj.data.angle = fov_rad
        cam_obj.data.keyframe_insert(data_path="angle", frame=start_frame)

        # Download & place ElevenLabs MP3 strip in VSE
        audio_url = act.get("audio_url")
        if audio_url:
            full_url = audio_url if audio_url.startswith("http") else f"{{BACKEND_BASE_URL}}{{audio_url}}"
            local_mp3 = os.path.join(audio_tmp_dir, f"act_{{act['act_number']:02d}}.mp3")
            try:
                urllib.request.urlretrieve(full_url, local_mp3)
                scene.sequence_editor.sequences.new_sound(
                    name=f"Act_{{act['act_number']:02d}}_{{act['speaker_name']}}",
                    filepath=local_mp3,
                    channel=act["act_number"] % 6 + 1,
                    frame_start=start_frame,
                )
            except Exception as err:
                print(f"[AI-TV Blender Bridge] Aviso ao importar MP3 ({{full_url}}): {{err}}")

    # Apply interpolation curve mode (STEP_SOUTHPARK -> CONSTANT, CUBIC_BEZIER -> BEZIER)
    if arm_obj.animation_data and arm_obj.animation_data.action:
        for fcurve in arm_obj.animation_data.action.fcurves:
            for kp in fcurve.keyframe_points:
                kp.interpolation = "CONSTANT" if MANIFEST_DATA.get("visual_mode_recommendation") == "2D_SOUTHPARK" else "BEZIER"


def main():
    scene = ensure_scene_setup()
    cam_obj = ensure_studio_camera(scene)
    arm_obj = ensure_anchor_armature(scene)
    apply_act_keyframes(scene, arm_obj, cam_obj)
    print(f"[AI-TV Blender Bridge] Episódio '{{MANIFEST_DATA['episode_title']}}' importado com sucesso!")


if __name__ == "__main__":
    main()
'''
    return script
