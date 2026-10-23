"use client";

import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Cpu, Sparkles, Video, Volume2, Radio, CheckCircle2 } from "lucide-react";
import { AgentExecutionTrace, EpisodeManifest } from "@/lib/api";

interface AgentNodeData extends Record<string, unknown> {
  agentId: string;
  title: string;
  role: string;
  badge: string;
  provider: string;
  model: string;
  latencyMs: number;
  summary: string;
  accentColor: string;
  status: string;
  onInspect: (agentId: string) => void;
}

function TVEmployeeNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  const Icon =
    data.agentId === "ingest"
      ? Radio
      : data.agentId === "marcus"
      ? Cpu
      : data.agentId === "maya"
      ? Sparkles
      : data.agentId === "viktor"
      ? Video
      : Volume2;

  return (
    <div
      onClick={() => data.onInspect(data.agentId)}
      className={`w-72 rounded-2xl p-4 backdrop-blur-2xl bg-slate-950/85 border transition-all cursor-pointer shadow-2xl ${
        selected
          ? "border-cyan-400 ring-2 ring-cyan-400/30 scale-[1.02]"
          : "border-white/15 hover:border-white/30"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-950"
      />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-inner"
            style={{ backgroundColor: data.accentColor }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">
              {data.title}
            </div>
            <div className="text-[10px] text-slate-400">{data.role}</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/10 text-cyan-300 border border-white/10">
          {data.provider}
        </span>
      </div>

      <div className="text-[11px] text-slate-300 bg-black/40 rounded-xl p-2.5 border border-white/5 mb-2.5 line-clamp-3 leading-relaxed">
        {data.summary}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          {data.model}
        </span>
        <span>{data.latencyMs} ms • Inspecionar →</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-fuchsia-400 !border-2 !border-slate-950"
      />
    </div>
  );
}

const nodeTypes = { tvAgent: TVEmployeeNode };

interface NodeGraphProps {
  manifest: EpisodeManifest | null;
  onSelectAgentNode: (agentId: string) => void;
}

export default function NodeGraph({
  manifest,
  onSelectAgentNode,
}: NodeGraphProps) {
  const traceMap = useMemo(() => {
    const map: Record<string, AgentExecutionTrace> = {};
    manifest?.agent_traces?.forEach((t) => {
      map[t.agent_id] = t;
    });
    return map;
  }, [manifest]);

  const initialNodes: Node<AgentNodeData>[] = useMemo(
    () => [
      {
        id: "ingest",
        type: "tvAgent",
        position: { x: 40, y: 180 },
        data: {
          agentId: "ingest",
          title: "Ingestão Multimodal",
          role: "Pauta + Vídeo/Áudio + Whisper",
          badge: "INPUT",
          provider: manifest?.input_media_filename ? "upload+whisper" : "omni-prompt",
          model: manifest?.input_media_filename || "Texto / Pauta Direta",
          latencyMs: 18,
          summary:
            manifest?.editorial_thesis ||
            "Aguardando pauta ou upload de mídia (.mp4/.mp3/.wav) na Gemini OmniBar.",
          accentColor: "#0284c7",
          status: "ready",
          onInspect: onSelectAgentNode,
        },
      },
      {
        id: "marcus",
        type: "tvAgent",
        position: { x: 370, y: 70 },
        data: {
          agentId: "marcus",
          title: "Marcus Vance",
          role: "Diretor de Workflow & Grade de TV",
          badge: "AGENTE 01",
          provider: traceMap.marcus?.provider_used || "gemini",
          model: traceMap.marcus?.model_used || "gemini-2.5-flash",
          latencyMs: traceMap.marcus?.latency_ms || 0,
          summary:
            traceMap.marcus?.summary_output ||
            "Decide qual programa da emissora produzirá o conteúdo (Plantão Neural 24h, Choque de Cortiça, Mesa Redonda ou Dossiê).",
          accentColor: "#2563eb",
          status: traceMap.marcus?.status || "idle",
          onInspect: onSelectAgentNode,
        },
      },
      {
        id: "maya",
        type: "tvAgent",
        position: { x: 710, y: 210 },
        data: {
          agentId: "maya",
          title: "Maya Lin",
          role: "Engenheira de Conteúdo Viral & Social",
          badge: "AGENTE 02",
          provider: traceMap.maya?.provider_used || "claude",
          model: traceMap.maya?.model_used || "claude-3-5-sonnet",
          latencyMs: traceMap.maya?.latency_ms || 0,
          summary:
            traceMap.maya?.summary_output ||
            "Reescreve diálogos com ganchos de 2s, define emoção (SHOCK, OUTRAGE, SARCASM...) e calibra stability/style_exaggeration.",
          accentColor: "#9333ea",
          status: traceMap.maya?.status || "idle",
          onInspect: onSelectAgentNode,
        },
      },
      {
        id: "viktor",
        type: "tvAgent",
        position: { x: 1050, y: 70 },
        data: {
          agentId: "viktor",
          title: "Viktor K.",
          role: "Diretor Técnico Rigs 3D/2D & Higgsfield",
          badge: "AGENTE 03",
          provider: traceMap.viktor?.provider_used || "chatgpt",
          model: traceMap.viktor?.model_used || "gpt-4o",
          latencyMs: traceMap.viktor?.latency_ms || 0,
          summary:
            traceMap.viktor?.summary_output ||
            "Gera prompts técnicos cinematográficos para Higgsfield e keyframes exatos de ossos IK/FK e câmera FOV.",
          accentColor: "#e11d48",
          status: traceMap.viktor?.status || "idle",
          onInspect: onSelectAgentNode,
        },
      },
      {
        id: "elevenlabs",
        type: "tvAgent",
        position: { x: 1380, y: 200 },
        data: {
          agentId: "elevenlabs",
          title: "ElevenLabs + Master Out",
          role: "TTS Físico (.mp3) & Timecode Sync",
          badge: "PIPELINE",
          provider: traceMap.elevenlabs?.provider_used || "elevenlabs",
          model: traceMap.elevenlabs?.model_used || "eleven_multilingual_v2",
          latencyMs: traceMap.elevenlabs?.latency_ms || 0,
          summary:
            traceMap.elevenlabs?.summary_output ||
            "Gera .mp3 físicos em /outputs/audio, mede duração via Mutagen e sincroniza timeline, Blender bpy e Higgsfield.",
          accentColor: "#059669",
          status: traceMap.elevenlabs?.status || "idle",
          onInspect: onSelectAgentNode,
        },
      },
    ],
    [manifest, traceMap, onSelectAgentNode]
  );

  const initialEdges: Edge[] = useMemo(
    () => [
      {
        id: "e-ingest-marcus",
        source: "ingest",
        target: "marcus",
        animated: true,
        style: { stroke: "#38bdf8", strokeWidth: 2.5 },
      },
      {
        id: "e-marcus-maya",
        source: "marcus",
        target: "maya",
        animated: true,
        style: { stroke: "#a855f7", strokeWidth: 2.5 },
      },
      {
        id: "e-maya-viktor",
        source: "maya",
        target: "viktor",
        animated: true,
        style: { stroke: "#f43f5e", strokeWidth: 2.5 },
      },
      {
        id: "e-viktor-eleven",
        source: "viktor",
        target: "elevenlabs",
        animated: true,
        style: { stroke: "#10b981", strokeWidth: 2.5 },
      },
    ],
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  return (
    <div className="w-full h-full bg-[#060913] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} size={1.5} />
        <Controls className="!bg-slate-900/90 !border-white/10 !rounded-xl !overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-white/10 [&>button]:!text-slate-200" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor="rgba(2, 6, 23, 0.75)"
          className="!bg-slate-950/90 !border !border-white/15 !rounded-xl"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute top-20 right-6 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-xl border border-white/10 text-[11px] text-slate-300">
        💡 Clique em qualquer funcionário/node para abrir o <b>Node Inspector</b> e reprocessar a cadeia
      </div>
    </div>
  );
}
