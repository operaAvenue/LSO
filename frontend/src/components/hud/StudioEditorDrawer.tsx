"use client";

import React, { useRef, useState } from "react";
import {
  Box,
  Users,
  Layers,
  Sun,
  Gauge,
  FolderKanban,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move,
  RotateCw,
  Maximize,
  Save,
  Download,
  Camera,
  X,
  Copy,
} from "lucide-react";
import {
  CameraBookmark,
  CharacterSpec,
  SceneObjectItem,
  SceneObjectKind,
  StudioLayer,
  StudioLightConfig,
  StudioProjectState,
  ViewportQualityConfig,
  uploadStudioAsset,
} from "@/lib/api";

export type StudioEditorTab =
  | "OBJECTS"
  | "CHARACTERS"
  | "LAYERS"
  | "LIGHT_CAM"
  | "QUALITY"
  | "PROJECTS";

interface StudioEditorDrawerProps {
  isOpen: boolean;
  activeTab: StudioEditorTab;
  onSelectTab: (tab: StudioEditorTab) => void;
  onClose: () => void;
  layers: StudioLayer[];
  onChangeLayers: (layers: StudioLayer[]) => void;
  sceneObjects: SceneObjectItem[];
  onChangeSceneObjects: (objs: SceneObjectItem[]) => void;
  characters: CharacterSpec[];
  onChangeCharacters: (chars: CharacterSpec[]) => void;
  lighting: StudioLightConfig;
  onChangeLighting: (light: StudioLightConfig) => void;
  cameras: CameraBookmark[];
  onChangeCameras: (cams: CameraBookmark[]) => void;
  activeCameraId: string;
  onSelectCameraId: (id: string) => void;
  quality: ViewportQualityConfig;
  onChangeQuality: (q: ViewportQualityConfig) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  transformMode: "translate" | "rotate" | "scale";
  onChangeTransformMode: (m: "translate" | "rotate" | "scale") => void;
  projectName: string;
  onChangeProjectName: (name: string) => void;
  savedProjects: StudioProjectState[];
  onSaveProject: () => Promise<void>;
  onLoadProject: (proj: StudioProjectState) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onExportProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
  onEnsure3DStage?: () => void;
}

const STUDIO_PRIMITIVES: { kind: SceneObjectKind; label: string; color: string }[] = [
  { kind: "anchor_desk", label: "Bancada Telejornal", color: "#0f172a" },
  { kind: "studio_camera", label: "Câmera Pedestal", color: "#1e293b" },
  { kind: "led_wall", label: "Painel LED Wall", color: "#050814" },
  { kind: "teleprompter", label: "Teleprompter", color: "#0284c7" },
  { kind: "sofa", label: "Sofá Talkshow", color: "#7c2d12" },
  { kind: "podium", label: "Púlpito Debate", color: "#1e293b" },
  { kind: "plant", label: "Planta Estúdio", color: "#15803d" },
  { kind: "truss", label: "Grid Aéreo (Truss)", color: "#334155" },
  { kind: "cube", label: "Bloco 3D", color: "#3b82f6" },
  { kind: "cylinder", label: "Coluna / Cilindro", color: "#6366f1" },
];

const LIGHT_PRESETS: Record<
  StudioLightConfig["preset"],
  Partial<StudioLightConfig>
> = {
  cyber_newsroom: {
    preset: "cyber_newsroom",
    ambient_intensity: 0.65,
    key_intensity: 2.2,
    key_color: "#ffffff",
    fill_intensity: 1.5,
    fill_color: "#38bdf8",
    rim_intensity: 3.2,
    rim_color: "#00f0ff",
    background_top: "#05070f",
    background_bottom: "#04060c",
  },
  warm_talkshow: {
    preset: "warm_talkshow",
    ambient_intensity: 0.8,
    key_intensity: 2.4,
    key_color: "#fde68a",
    fill_intensity: 1.4,
    fill_color: "#fb923c",
    rim_intensity: 2.2,
    rim_color: "#f43f5e",
    background_top: "#1c1018",
    background_bottom: "#0c060a",
  },
  high_contrast_noir: {
    preset: "high_contrast_noir",
    ambient_intensity: 0.22,
    key_intensity: 3.4,
    key_color: "#f8fafc",
    fill_intensity: 0.4,
    fill_color: "#475569",
    rim_intensity: 4.0,
    rim_color: "#38bdf8",
    background_top: "#020408",
    background_bottom: "#000000",
  },
  chroma_green_screen: {
    preset: "chroma_green_screen",
    ambient_intensity: 1.1,
    key_intensity: 2.0,
    key_color: "#ffffff",
    fill_intensity: 1.8,
    fill_color: "#ffffff",
    rim_intensity: 1.5,
    rim_color: "#22c55e",
    background_top: "#00b140",
    background_bottom: "#009e38",
  },
  daylight_broadcast: {
    preset: "daylight_broadcast",
    ambient_intensity: 0.95,
    key_intensity: 2.5,
    key_color: "#fffbeb",
    fill_intensity: 1.6,
    fill_color: "#bae6fd",
    rim_intensity: 2.0,
    rim_color: "#38bdf8",
    background_top: "#0f172a",
    background_bottom: "#1e293b",
  },
};

export default function StudioEditorDrawer({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
  layers,
  onChangeLayers,
  sceneObjects,
  onChangeSceneObjects,
  characters,
  onChangeCharacters,
  lighting,
  onChangeLighting,
  cameras,
  onChangeCameras,
  activeCameraId,
  onSelectCameraId,
  quality,
  onChangeQuality,
  selectedItemId,
  onSelectItem,
  transformMode,
  onChangeTransformMode,
  projectName,
  onChangeProjectName,
  savedProjects,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onExportProjectJson,
  onImportProjectJson,
  onEnsure3DStage,
}: StudioEditorDrawerProps) {
  const [uploading, setUploading] = useState(false);
  const [savingProj, setSavingProj] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState("");
  const modelInputRef = useRef<HTMLInputElement>(null);
  const newCharGlbInputRef = useRef<HTMLInputElement>(null);
  const char3DInputRef = useRef<HTMLInputElement>(null);
  const char2DInputRef = useRef<HTMLInputElement>(null);
  const projectJsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedObj = sceneObjects.find((o) => o.id === selectedItemId) || null;
  const selectedChar =
    characters.find((c) => c.id === selectedItemId) || characters[0] || null;

  const updateSelectedObj = (patch: Partial<SceneObjectItem>) => {
    if (!selectedObj) return;
    onChangeSceneObjects(
      sceneObjects.map((o) => (o.id === selectedObj.id ? { ...o, ...patch } : o))
    );
  };

  const updateChar = (id: string, patch: Partial<CharacterSpec>) => {
    onChangeCharacters(
      characters.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const handleUpload3DOr2DObject = async (file: File) => {
    setUploading(true);
    setBanner(null);
    try {
      const uploaded = await uploadStudioAsset(file);
      const is2D = ["png", "svg", "webp", "jpg", "jpeg"].includes(uploaded.format);
      if (!is2D) {
        onEnsure3DStage?.();
      }
      const newObj: SceneObjectItem = {
        id: `obj_${Date.now()}`,
        name: file.name,
        layer_id: is2D ? "layer_overlays" : "layer_props",
        kind: is2D ? "sprite_2d" : "imported_model",
        format: uploaded.format,
        asset_url: uploaded.url,
        position: [0, -0.35, 1.35],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#e2e8f0",
        emissive: "#000000",
        emissive_intensity: 0,
        metalness: 0.35,
        roughness: 0.45,
        cast_shadow: true,
        receive_shadow: true,
        visible: true,
        locked: false,
      };
      onChangeSceneObjects([...sceneObjects, newObj]);
      onSelectItem(newObj.id);
      setBanner(`Asset "${file.name}" (.${uploaded.format.toUpperCase()}) importado no palco!`);
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : "Erro ao importar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const applyQualityPreset = (preset: ViewportQualityConfig["preset"]) => {
    if (preset === "ULTRA_AAA") {
      onChangeQuality({
        ...quality,
        preset,
        dpr_min: 1.5,
        dpr_max: 2.0,
        shadows: true,
        shadow_map_size: 2048,
        antialias: true,
        contact_shadows: true,
      });
    } else if (preset === "BALANCED") {
      onChangeQuality({
        ...quality,
        preset,
        dpr_min: 1.0,
        dpr_max: 1.5,
        shadows: true,
        shadow_map_size: 1024,
        antialias: true,
        contact_shadows: true,
      });
    } else if (preset === "PERFORMANCE_60FPS") {
      onChangeQuality({
        ...quality,
        preset,
        dpr_min: 0.85,
        dpr_max: 1.0,
        shadows: true,
        shadow_map_size: 512,
        antialias: false,
        contact_shadows: false,
      });
    } else {
      onChangeQuality({
        ...quality,
        preset,
        dpr_min: 0.5,
        dpr_max: 0.75,
        shadows: false,
        shadow_map_size: 512,
        antialias: false,
        contact_shadows: false,
      });
    }
  };

  return (
    <aside className="fixed top-14 left-4 z-40 w-[min(460px,94vw)] max-h-[calc(100vh-250px)] flex flex-col theme-panel shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden select-none">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-bg-2)",
        }}
      >
        <div
          className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider"
          style={{ color: "var(--theme-accent)" }}
        >
          <Box className="w-4 h-4" />
          <span>Studio Editor 3D/2D & Scene Builder</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:opacity-80 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div
        className="grid grid-cols-6 gap-1 p-1.5 border-b text-[10px] font-bold"
        style={{
          backgroundColor: "var(--theme-bg)",
          borderColor: "var(--theme-border)",
        }}
      >
        {[
          { id: "OBJECTS" as const, icon: Box, label: "Cenário" },
          { id: "CHARACTERS" as const, icon: Users, label: "Elenco" },
          { id: "LAYERS" as const, icon: Layers, label: "Camadas" },
          { id: "LIGHT_CAM" as const, icon: Sun, label: "Luz/Cam" },
          { id: "QUALITY" as const, icon: Gauge, label: "3D Perf" },
          { id: "PROJECTS" as const, icon: FolderKanban, label: "Projetos" },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab(t.id)}
              className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                active
                  ? "theme-accent-bg shadow"
                  : "opacity-75 hover:opacity-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs">
        {banner && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] flex items-center justify-between">
            <span>{banner}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-cyan-300 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: 3D/2D SCENE OBJECTS & MULTI-FORMAT IMPORTER */}
        {activeTab === "OBJECTS" && (
          <div className="space-y-3.5">
            {/* Multi-Format File Importer */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-slate-900/80 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-200">
                  Importar Modelo 3D ou Sprite 2D
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  GLB • GLTF • OBJ • FBX • STL • DAE • PLY • PNG • SVG
                </span>
              </div>
              <input
                ref={modelInputRef}
                type="file"
                accept=".glb,.gltf,.obj,.fbx,.stl,.dae,.ply,.png,.svg,.webp,.jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleUpload3DOr2DObject(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => modelInputRef.current?.click()}
                className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {uploading
                    ? "Importando Asset para o Estúdio..."
                    : "Selecionar Arquivo 3D / 2D no Computador"}
                </span>
              </button>
            </div>

            {/* 1-Click Broadcast Studio Props Library */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Adicionar Objetos de Estúdio 3D
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {STUDIO_PRIMITIVES.map((prim) => (
                  <button
                    key={prim.kind}
                    type="button"
                    onClick={() => {
                      const created: SceneObjectItem = {
                        id: `obj_${prim.kind}_${Date.now().toString().slice(-4)}`,
                        name: prim.label,
                        layer_id: "layer_props",
                        kind: prim.kind,
                        position: [
                          Number(((Math.random() - 0.5) * 2).toFixed(2)),
                          0,
                          Number(((Math.random() - 0.5) * 1.5).toFixed(2)),
                        ],
                        rotation: [0, 0, 0],
                        scale: [1, 1, 1],
                        color: prim.color,
                        emissive: "#00f0ff",
                        emissive_intensity: 1.2,
                        metalness: 0.6,
                        roughness: 0.3,
                        cast_shadow: true,
                        receive_shadow: true,
                        visible: true,
                        locked: false,
                      };
                      onChangeSceneObjects([...sceneObjects, created]);
                      onSelectItem(created.id);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{prim.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Transform Gizmo Mode */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-black/50 border border-white/10">
              <span className="text-[11px] text-slate-400 pl-1">
                Gizmo 3D no Palco:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { id: "translate" as const, icon: Move, label: "Mover" },
                  { id: "rotate" as const, icon: RotateCw, label: "Girar" },
                  { id: "scale" as const, icon: Maximize, label: "Escala" },
                ].map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onChangeTransformMode(g.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                        transformMode === g.id
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-white/5 text-slate-300 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Object Inspector */}
            {selectedObj ? (
              <div className="p-3 rounded-2xl bg-black/55 border border-cyan-500/35 space-y-2.5">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={selectedObj.name}
                    onChange={(e) => updateSelectedObj({ name: e.target.value })}
                    className="bg-slate-900 px-2.5 py-1 rounded-lg border border-white/15 text-xs font-bold text-white"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Duplicar Objeto"
                      onClick={() => {
                        const copy: SceneObjectItem = {
                          ...selectedObj,
                          id: `${selectedObj.id}_copy_${Date.now().toString().slice(-3)}`,
                          name: `${selectedObj.name} (Cópia)`,
                          position: [
                            selectedObj.position[0] + 0.5,
                            selectedObj.position[1],
                            selectedObj.position[2],
                          ],
                        };
                        onChangeSceneObjects([...sceneObjects, copy]);
                        onSelectItem(copy.id);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Remover Objeto"
                      onClick={() => {
                        onChangeSceneObjects(
                          sceneObjects.filter((o) => o.id !== selectedObj.id)
                        );
                        onSelectItem(null);
                      }}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Position X / Y / Z */}
                <div className="grid grid-cols-3 gap-1.5">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <div key={`pos-${axis}`}>
                      <label className="text-[10px] text-slate-400">
                        Pos {axis}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedObj.position[i]}
                        onChange={(e) => {
                          const next: [number, number, number] = [
                            ...selectedObj.position,
                          ];
                          next[i] = parseFloat(e.target.value) || 0;
                          updateSelectedObj({ position: next });
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 font-mono text-[11px]"
                      />
                    </div>
                  ))}
                </div>

                {/* Rotation X / Y / Z */}
                <div className="grid grid-cols-3 gap-1.5">
                  {["X°", "Y°", "Z°"].map((axis, i) => (
                    <div key={`rot-${axis}`}>
                      <label className="text-[10px] text-slate-400">
                        Rot {axis}
                      </label>
                      <input
                        type="number"
                        step="5"
                        value={selectedObj.rotation[i]}
                        onChange={(e) => {
                          const next: [number, number, number] = [
                            ...selectedObj.rotation,
                          ];
                          next[i] = parseFloat(e.target.value) || 0;
                          updateSelectedObj({ rotation: next });
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 font-mono text-[11px]"
                      />
                    </div>
                  ))}
                </div>

                {/* Scale & Material Color */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-[10px] text-slate-400">Escala</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.05"
                      value={selectedObj.scale[0]}
                      onChange={(e) => {
                        const s = Math.max(0.05, parseFloat(e.target.value) || 1);
                        updateSelectedObj({ scale: [s, s, s] });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">
                      Cor Base
                    </label>
                    <input
                      type="color"
                      value={selectedObj.color}
                      onChange={(e) => updateSelectedObj({ color: e.target.value })}
                      className="w-full h-7 rounded bg-transparent cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">
                      Camada
                    </label>
                    <select
                      value={selectedObj.layer_id}
                      onChange={(e) =>
                        updateSelectedObj({ layer_id: e.target.value })
                      }
                      className="w-full px-1.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[10px]"
                    >
                      {layers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400 text-center">
                Clique em qualquer objeto na lista abaixo ou direto no palco 3D para editar posição, rotação, escala e materiais.
              </div>
            )}

            {/* Scene Objects List */}
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {sceneObjects.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => onSelectItem(obj.id)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[11px] cursor-pointer transition ${
                    selectedItemId === obj.id
                      ? "bg-cyan-500/20 border-cyan-400 text-white"
                      : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="truncate font-medium">{obj.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeSceneObjects(
                          sceneObjects.map((o) =>
                            o.id === obj.id ? { ...o, visible: !o.visible } : o
                          )
                        );
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {obj.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeSceneObjects(
                          sceneObjects.map((o) =>
                            o.id === obj.id ? { ...o, locked: !o.locked } : o
                          )
                        );
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {obj.locked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 3D & 2D CHARACTER CREATOR / CUSTOMIZER */}
        {activeTab === "CHARACTERS" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Elenco da Emissora ({characters.length})
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={newCharGlbInputRef}
                  type="file"
                  accept=".glb,.gltf,.fbx,.obj"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setUploading(true);
                    setBanner("Carregando e normalizando personagem 3D (.GLB)...");
                    try {
                      const res = await uploadStudioAsset(f);
                      onEnsure3DStage?.();
                      const cleanName = f.name.replace(/\.[^/.]+$/, "");
                      const newChar: CharacterSpec = {
                        id: `char_${Date.now().toString().slice(-4)}`,
                        name: cleanName,
                        role: "Personagem 3D (.GLB)",
                        layer_id: "layer_characters",
                        mode: "BOTH",
                        voice_id: "pNInz6obpgDQGcFmaJgB",
                        position: [0, -0.35, 1.35],
                        rotation: [0, 0, 0],
                        scale: 1.0,
                        skin_color: "#e2b897",
                        suit_color: "#0f172a",
                        shirt_color: "#ffffff",
                        tie_color: "#00f0ff",
                        hair_style: "executive",
                        hair_color: "#1e293b",
                        hat_style: "none",
                        hat_color: "#3b82f6",
                        glasses: false,
                        glove_color: "#10b981",
                        eye_scale: 1.0,
                        custom_3d_model_url: res.url,
                        custom_3d_format: res.format,
                        visible: true,
                        locked: false,
                        is_active_speaker: true,
                      };
                      onChangeCharacters([...characters, newChar]);
                      onSelectItem(newChar.id);
                      setBanner(
                        `✅ Personagem 3D "${cleanName}" (.${res.format.toUpperCase()}) criado e posicionado na frente do palco!`
                      );
                    } catch (err: unknown) {
                      setBanner(
                        err instanceof Error
                          ? err.message
                          : "Erro ao importar personagem .GLB"
                      );
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => newCharGlbInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Importando..." : "+ Personagem .GLB"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newChar: CharacterSpec = {
                      id: `char_${Date.now().toString().slice(-4)}`,
                      name: `Apresentador ${characters.length + 1}`,
                      role: "Comentarista Convidado",
                      layer_id: "layer_characters",
                      mode: "BOTH",
                      voice_id: "pNInz6obpgDQGcFmaJgB",
                      position: [
                        Number(
                          (characters.length % 2 === 0 ? 1.15 : -1.15).toFixed(2)
                        ),
                        -0.35,
                        0,
                      ],
                      rotation: [0, characters.length % 2 === 0 ? -15 : 15, 0],
                      scale: 1.0,
                      skin_color: "#e2b897",
                      suit_color: "#0f172a",
                      shirt_color: "#ffffff",
                      tie_color: "#f59e0b",
                      hair_style: "spiky",
                      hair_color: "#1e293b",
                      hat_style: "none",
                      hat_color: "#3b82f6",
                      glasses: false,
                      glove_color: "#10b981",
                      eye_scale: 1.0,
                      visible: true,
                      locked: false,
                      is_active_speaker: false,
                    };
                    onChangeCharacters([...characters, newChar]);
                    onSelectItem(newChar.id);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Procedural
                </button>
              </div>
            </div>

            {/* Character Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectItem(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 border transition cursor-pointer ${
                    selectedChar?.id === c.id
                      ? "bg-fuchsia-600/30 border-fuchsia-400 text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {c.is_active_speaker ? "🎙️ " : ""}
                  {c.name}
                </button>
              ))}
            </div>

            {selectedChar && (
              <div className="p-3 rounded-2xl bg-black/55 border border-fuchsia-500/35 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Nome</label>
                    <input
                      type="text"
                      value={selectedChar.name}
                      onChange={(e) =>
                        updateChar(selectedChar.id, { name: e.target.value })
                      }
                      className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Papel / Cargo</label>
                    <input
                      type="text"
                      value={selectedChar.role}
                      onChange={(e) =>
                        updateChar(selectedChar.id, { role: e.target.value })
                      }
                      className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs"
                    />
                  </div>
                </div>

                {/* Hair, Hat & Mode */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Cabelo</label>
                    <select
                      value={selectedChar.hair_style}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          hair_style: e.target.value as CharacterSpec["hair_style"],
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px]"
                    >
                      <option value="executive">Executivo</option>
                      <option value="spiky">Espetado</option>
                      <option value="bob">Bob / Médio</option>
                      <option value="mohawk">Moicano</option>
                      <option value="bald">Careca</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Acessório</label>
                    <select
                      value={selectedChar.hat_style}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          hat_style: e.target.value as CharacterSpec["hat_style"],
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px]"
                    >
                      <option value="none">Sem Chapéu</option>
                      <option value="beanie">Gorro South Park</option>
                      <option value="fedora">Fedora</option>
                      <option value="headphones">Headset Broadcast</option>
                      <option value="crown">Coroa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Motor</label>
                    <select
                      value={selectedChar.mode}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          mode: e.target.value as CharacterSpec["mode"],
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px]"
                    >
                      <option value="BOTH">3D + 2D</option>
                      <option value="3D">Apenas 3D</option>
                      <option value="2D_SOUTHPARK">Apenas 2D</option>
                    </select>
                  </div>
                </div>

                {/* Color Pickers: Skin, Suit, Tie, Hair, Hat */}
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { key: "skin_color" as const, label: "Pele" },
                    { key: "suit_color" as const, label: "Traje" },
                    { key: "tie_color" as const, label: "Gravata" },
                    { key: "hair_color" as const, label: "Cabelo" },
                    { key: "hat_color" as const, label: "Chapéu" },
                  ].map((col) => (
                    <div key={col.key}>
                      <span className="text-[10px] text-slate-400 block">
                        {col.label}
                      </span>
                      <input
                        type="color"
                        value={selectedChar[col.key]}
                        onChange={(e) =>
                          updateChar(selectedChar.id, { [col.key]: e.target.value })
                        }
                        className="w-full h-6 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                {/* Position X / Y / Z & Scale */}
                <div className="grid grid-cols-4 gap-1.5">
                  {["X", "Y", "Z"].map((axis, idx) => (
                    <div key={axis}>
                      <label className="text-[10px] text-slate-400">
                        Pos {axis}
                      </label>
                      <input
                        type="number"
                        step="0.15"
                        value={selectedChar.position[idx]}
                        onChange={(e) => {
                          const next: [number, number, number] = [
                            ...selectedChar.position,
                          ];
                          next[idx] = parseFloat(e.target.value) || 0;
                          updateChar(selectedChar.id, { position: next });
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 font-mono text-[11px]"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] text-slate-400">Escala</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.4"
                      max="2.5"
                      value={selectedChar.scale}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          scale: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Toggles: Active Speaker Lip-Sync & Glasses */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChar.is_active_speaker}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          is_active_speaker: e.target.checked,
                        })
                      }
                      className="accent-fuchsia-500"
                    />
                    <span>Sincronizar Lip-Sync MP3 neste personagem</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChar.glasses}
                      onChange={(e) =>
                        updateChar(selectedChar.id, {
                          glasses: e.target.checked,
                        })
                      }
                      className="accent-cyan-400"
                    />
                    <span>Óculos</span>
                  </label>
                </div>

                {/* Active 3D Mesh Status Badge & Quick Stage Positioning */}
                {selectedChar.custom_3d_model_url && (
                  <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-cyan-300 truncate">
                        ✅ Mesh 3D Ativa (.{(selectedChar.custom_3d_format || "glb").toUpperCase()})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateChar(selectedChar.id, {
                            custom_3d_model_url: undefined,
                            custom_3d_format: undefined,
                          })
                        }
                        className="text-red-300 hover:text-red-200 underline text-[10px] cursor-pointer"
                      >
                        Voltar ao Procedural
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateChar(selectedChar.id, {
                            position: [0, -0.35, 1.35],
                          })
                        }
                        className="py-1 px-2 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-100 text-[10px] font-semibold cursor-pointer"
                      >
                        Posicionar na Frente da Bancada
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateChar(selectedChar.id, {
                            position: [0, -0.35, 0],
                          })
                        }
                        className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-semibold cursor-pointer"
                      >
                        Posicionar Atrás da Bancada
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom 3D Rig / 2D Cutout Sprite Upload for this Character */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    ref={char3DInputRef}
                    type="file"
                    accept=".glb,.gltf,.fbx,.obj"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      setBanner(`Carregando "${f.name}" para ${selectedChar.name}...`);
                      try {
                        const res = await uploadStudioAsset(f);
                        onEnsure3DStage?.();
                        updateChar(selectedChar.id, {
                          custom_3d_model_url: res.url,
                          custom_3d_format: res.format,
                          mode: "BOTH",
                          visible: true,
                          position:
                            selectedChar.position[2] <= 0.1
                              ? [selectedChar.position[0], -0.35, 1.35]
                              : selectedChar.position,
                        });
                        setBanner(
                          `✅ Mesh 3D "${f.name}" aplicada em ${selectedChar.name} no Palco 3D!`
                        );
                      } catch (err: unknown) {
                        setBanner(
                          err instanceof Error
                            ? err.message
                            : "Erro ao carregar arquivo .GLB"
                        );
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => char3DInputRef.current?.click()}
                    className="py-1.5 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-cyan-400" />
                    <span>
                      {uploading
                        ? "Carregando .GLB..."
                        : "Importar Mesh 3D (.GLB/.FBX)"}
                    </span>
                  </button>

                  <input
                    ref={char2DInputRef}
                    type="file"
                    accept=".png,.svg,.webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      try {
                        const res = await uploadStudioAsset(f);
                        updateChar(selectedChar.id, {
                          custom_2d_head_url: res.url,
                        });
                        setBanner(`Cabeça 2D recortada atribuída a ${selectedChar.name}!`);
                      } catch (err: unknown) {
                        setBanner(
                          err instanceof Error
                            ? err.message
                            : "Erro ao carregar imagem 2D"
                        );
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => char2DInputRef.current?.click()}
                    className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>Importar Cabeça 2D (.PNG/.SVG)</span>
                  </button>
                </div>

                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeCharacters(
                        characters.filter((c) => c.id !== selectedChar.id)
                      );
                    }}
                    className="w-full py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-[11px] flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover Personagem
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LAYERS OUTLINER */}
        {activeTab === "LAYERS" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="Nome da nova camada (ex: Drones, Cenário Fundo)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newLayerName.trim()) return;
                  onChangeLayers([
                    ...layers,
                    {
                      id: `layer_${Date.now().toString().slice(-4)}`,
                      name: newLayerName.trim(),
                      category: "props",
                      visible: true,
                      locked: false,
                      color_tag: "#38bdf8",
                    },
                  ]);
                  setNewLayerName("");
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Camada
              </button>
            </div>

            <div className="space-y-2">
              {layers.map((layer) => {
                const countObjs =
                  sceneObjects.filter((o) => o.layer_id === layer.id).length +
                  characters.filter((c) => c.layer_id === layer.id).length;
                return (
                  <div
                    key={layer.id}
                    className="p-2.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layer.color_tag}
                        onChange={(e) =>
                          onChangeLayers(
                            layers.map((l) =>
                              l.id === layer.id
                                ? { ...l, color_tag: e.target.value }
                                : l
                            )
                          )
                        }
                        className="w-4 h-4 rounded bg-transparent cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-200">{layer.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {countObjs} itens vinculados
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeLayers(
                            layers.map((l) =>
                              l.id === layer.id
                                ? { ...l, visible: !l.visible }
                                : l
                            )
                          )
                        }
                        className={`p-1.5 rounded-lg border ${
                          layer.visible
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-white/5 border-white/10 text-slate-500"
                        }`}
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onChangeLayers(
                            layers.map((l) =>
                              l.id === layer.id
                                ? { ...l, locked: !l.locked }
                                : l
                            )
                          )
                        }
                        className={`p-1.5 rounded-lg border ${
                          layer.locked
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        {layer.locked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: STUDIO LIGHTING & MULTI-CAMERA SWITCHER */}
        {activeTab === "LIGHT_CAM" && (
          <div className="space-y-4">
            {/* Lighting Presets */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Esquema de Iluminação do Estúdio
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "cyber_newsroom", label: "Cyber Newsroom" },
                    { id: "warm_talkshow", label: "Warm Talkshow" },
                    { id: "high_contrast_noir", label: "Noir Investigativo" },
                    { id: "chroma_green_screen", label: "Chroma Key Verde" },
                    { id: "daylight_broadcast", label: "Daylight Broadcast" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onChangeLighting({
                        ...lighting,
                        ...LIGHT_PRESETS[p.id],
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border text-left transition cursor-pointer ${
                      lighting.preset === p.id
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Light Intensities & Colors */}
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
              {[
                {
                  label: "Key Light (Principal)",
                  intKey: "key_intensity" as const,
                  colKey: "key_color" as const,
                  max: 6,
                },
                {
                  label: "Fill Light (Preenchimento)",
                  intKey: "fill_intensity" as const,
                  colKey: "fill_color" as const,
                  max: 5,
                },
                {
                  label: "Rim / Backlight (Recorte)",
                  intKey: "rim_intensity" as const,
                  colKey: "rim_color" as const,
                  max: 6,
                },
                {
                  label: "Ambient Light (Base)",
                  intKey: "ambient_intensity" as const,
                  colKey: "ambient_color" as const,
                  max: 2.5,
                },
              ].map((lt) => (
                <div key={lt.intKey} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">{lt.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-300">
                        {lighting[lt.intKey].toFixed(2)}
                      </span>
                      <input
                        type="color"
                        value={lighting[lt.colKey]}
                        onChange={(e) =>
                          onChangeLighting({
                            ...lighting,
                            [lt.colKey]: e.target.value,
                          })
                        }
                        className="w-5 h-5 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={lt.max}
                    step={0.05}
                    value={lighting[lt.intKey]}
                    onChange={(e) =>
                      onChangeLighting({
                        ...lighting,
                        [lt.intKey]: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Multi-Camera Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mesa de Corte de Câmeras ({cameras.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const cam: CameraBookmark = {
                      id: `cam_${Date.now().toString().slice(-4)}`,
                      name: `CAM 0${cameras.length + 1} • Custom`,
                      position: [
                        Number(((Math.random() - 0.5) * 3.5).toFixed(2)),
                        1.35,
                        2.85,
                      ],
                      target: [0, 0.85, 0],
                      fov: 38,
                      dutch_roll: 0,
                    };
                    onChangeCameras([...cameras, cam]);
                    onSelectCameraId(cam.id);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" /> Nova Câmera
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCameraId(cam.id)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      activeCameraId === cam.id
                        ? "bg-red-600/25 border-red-500 text-white"
                        : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-semibold text-[11px]">{cam.name}</span>
                    <span className="font-mono text-[10px] text-cyan-300">
                      FOV {cam.fov}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: 3D VIEWPORT QUALITY & PERFORMANCE OPTIMIZER */}
        {activeTab === "QUALITY" && (
          <div className="space-y-3.5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Preset de Performance do Renderizador WebGL
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "ULTRA_AAA", label: "🔥 Ultra AAA (2K Shadows)" },
                    { id: "BALANCED", label: "⚡ Equilibrado (Padrão)" },
                    { id: "PERFORMANCE_60FPS", label: "🚀 Performance 60 FPS" },
                    { id: "POTATO_LOW", label: "🪶 Leve / Economia GPU" },
                  ] as const
                ).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => applyQualityPreset(q.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border text-left transition cursor-pointer ${
                      quality.preset === q.id
                        ? "bg-emerald-500 text-slate-950 border-emerald-300"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span>Resolução de Sombras (ShadowMap)</span>
                <select
                  value={quality.shadow_map_size}
                  onChange={(e) =>
                    onChangeQuality({
                      ...quality,
                      shadow_map_size: Number(
                        e.target.value
                      ) as ViewportQualityConfig["shadow_map_size"],
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-white/15 font-mono text-[11px]"
                >
                  <option value={512}>512px (Rápido)</option>
                  <option value={1024}>1024px (Médio)</option>
                  <option value={2048}>2048px (Ultra)</option>
                </select>
              </div>

              {[
                { key: "shadows" as const, label: "Sombras Dinâmicas 3D" },
                { key: "contact_shadows" as const, label: "Contact Shadows no Piso" },
                { key: "antialias" as const, label: "Anti-Aliasing MSAA" },
                { key: "wireframe_debug" as const, label: "Modo Wireframe (Malha 3D)" },
                { key: "show_grid" as const, label: "Mostrar Grid Métrico do Estúdio" },
                { key: "show_axes" as const, label: "Mostrar Eixos XYZ" },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center justify-between text-[11px] cursor-pointer py-0.5"
                >
                  <span className="text-slate-300">{toggle.label}</span>
                  <input
                    type="checkbox"
                    checked={quality[toggle.key]}
                    onChange={(e) =>
                      onChangeQuality({
                        ...quality,
                        [toggle.key]: e.target.checked,
                      })
                    }
                    className="accent-emerald-400"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SAVE / LOAD / EXPORT STUDIO PROJECTS */}
        {activeTab === "PROJECTS" && (
          <div className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <label className="block text-[11px] text-slate-400">
                Nome do Projeto de Estúdio (Cenário + Elenco + Luz + Camadas)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => onChangeProjectName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-white"
              />
              <button
                type="button"
                disabled={savingProj}
                onClick={async () => {
                  setSavingProj(true);
                  setBanner(null);
                  try {
                    await onSaveProject();
                    setBanner(`Projeto "${projectName}" salvo no servidor!`);
                  } catch (err: unknown) {
                    setBanner(
                      err instanceof Error ? err.message : "Erro ao salvar projeto"
                    );
                  } finally {
                    setSavingProj(false);
                  }
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingProj
                    ? "Salvando Projeto..."
                    : "Salvar Projeto Completo no Servidor"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onExportProjectJson}
                  className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar .JSON</span>
                </button>
                <input
                  ref={projectJsonInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImportProjectJson(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => projectJsonInputRef.current?.click()}
                  className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Importar .JSON</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Projetos Salvos no Disco ({savedProjects.length})
              </div>
              {savedProjects.length === 0 ? (
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-slate-500 text-center text-[11px]">
                  Nenhum projeto salvo ainda. Clique em &ldquo;Salvar Projeto Completo&rdquo; acima.
                </div>
              ) : (
                savedProjects.map((proj) => (
                  <div
                    key={proj.project_id}
                    className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200">{proj.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {proj.scene_objects?.length || 0} objetos •{" "}
                        {proj.characters?.length || 0} personagens •{" "}
                        {proj.quality?.preset}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject(proj);
                          setBanner(`Projeto "${proj.name}" carregado!`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 text-[10px] font-bold"
                      >
                        Carregar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.project_id)}
                        className="p-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
