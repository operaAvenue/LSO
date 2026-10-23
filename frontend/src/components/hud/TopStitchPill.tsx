"use client";

import React from "react";
import {
  Tv,
  Cpu,
  Box,
  Scissors,
  Sliders,
  Network,
  Share2,
  KeyRound,
  Columns2,
  Sparkles,
  Wrench,
  FolderKanban,
} from "lucide-react";
import { LLMProvider, TVProgramType } from "@/lib/api";
import { StudioEditorTab } from "./StudioEditorDrawer";

export type WorkspaceLayoutMode = "STAGE" | "GRAPH" | "SPLIT";
export type RenderStageMode = "3D" | "2D_SOUTHPARK";
export type ActiveDrawerType =
  | null
  | "PUPPETEER"
  | "INSPECTOR"
  | "OUTPUTS"
  | "VAULT";

interface TopStitchPillProps {
  selectedProgram: TVProgramType;
  onSelectProgram: (program: TVProgramType) => void;
  llmProvider: LLMProvider;
  onSelectLlm: (provider: LLMProvider) => void;
  layoutMode: WorkspaceLayoutMode;
  onSelectLayoutMode: (mode: WorkspaceLayoutMode) => void;
  renderStageMode: RenderStageMode;
  onSelectRenderStageMode: (mode: RenderStageMode) => void;
  activeDrawer: ActiveDrawerType;
  onToggleDrawer: (drawer: Exclude<ActiveDrawerType, null>) => void;
  studioEditorOpen: boolean;
  onOpenStudioEditorTab: (tab: StudioEditorTab) => void;
  providerStatus: Record<string, boolean>;
}

const PROGRAMS: TVProgramType[] = [
  "Plantão Neural 24h",
  "Choque de Cortiça",
  "Mesa Redonda Viral",
  "Dossiê Hiper-Real",
];

const LLM_OPTIONS: { value: LLMProvider; label: string }[] = [
  { value: "squad_mode", label: "⚡ Squad Multi-LLM" },
  { value: "gemini", label: "Gemini 2.5 Flash" },
  { value: "chatgpt", label: "GPT-4o" },
  { value: "claude", label: "Claude 3.5 Sonnet" },
  { value: "grok", label: "xAI Grok-2" },
];

export default function TopStitchPill({
  selectedProgram,
  onSelectProgram,
  llmProvider,
  onSelectLlm,
  layoutMode,
  onSelectLayoutMode,
  renderStageMode,
  onSelectRenderStageMode,
  activeDrawer,
  onToggleDrawer,
  studioEditorOpen,
  onOpenStudioEditorTab,
  providerStatus,
}: TopStitchPillProps) {
  const configuredKeysCount = Object.values(providerStatus).filter(Boolean).length;

  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 z-40 max-w-[98vw]">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/82 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.75)]">
        {/* Brand Identity */}
        <div className="flex items-center gap-2 pr-2 border-r border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-md">
            <Tv className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-extrabold tracking-wider uppercase bg-gradient-to-r from-white via-cyan-200 to-fuchsia-200 bg-clip-text text-transparent hidden lg:inline">
            AI-TV Studio
          </span>
        </div>

        {/* Studio Scene & Character Editor Trigger */}
        <button
          type="button"
          onClick={() => onOpenStudioEditorTab("OBJECTS")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition border cursor-pointer ${
            studioEditorOpen
              ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow"
              : "bg-cyan-500/15 text-cyan-200 border-cyan-400/40 hover:bg-cyan-500/25"
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Editor 3D/2D & Elenco</span>
        </button>

        {/* Save / Load Projects Trigger */}
        <button
          type="button"
          onClick={() => onOpenStudioEditorTab("PROJECTS")}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition cursor-pointer"
        >
          <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Projetos</span>
        </button>

        {/* TV Program Selector */}
        <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <select
            aria-label="Selecionar Programa de TV"
            value={selectedProgram}
            onChange={(e) => {
              const val = e.target.value as TVProgramType;
              onSelectProgram(val);
              if (val === "Choque de Cortiça") {
                onSelectRenderStageMode("2D_SOUTHPARK");
              }
            }}
            className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer"
          >
            {PROGRAMS.map((p) => (
              <option key={p} value={p} className="bg-slate-900 text-white">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* LLM Engine Selector */}
        <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
          <Cpu className="w-3.5 h-3.5 text-fuchsia-400" />
          <select
            aria-label="Selecionar Motor LLM"
            value={llmProvider}
            onChange={(e) => onSelectLlm(e.target.value as LLMProvider)}
            className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer"
          >
            {LLM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Workspace View Mode (Palco / Split 50-50 / Grafo) */}
        <div className="flex items-center bg-black/50 p-0.5 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => onSelectLayoutMode("STAGE")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              layoutMode === "STAGE"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Palco
          </button>
          <button
            type="button"
            onClick={() => onSelectLayoutMode("SPLIT")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
              layoutMode === "SPLIT"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Columns2 className="w-3 h-3" />
            50/50
          </button>
          <button
            type="button"
            onClick={() => onSelectLayoutMode("GRAPH")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              layoutMode === "GRAPH"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Nodes
          </button>
        </div>

        {/* Toggle 3D Studio vs 2D South Park Paper-Cutout */}
        <div className="flex items-center bg-black/50 p-0.5 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => onSelectRenderStageMode("3D")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
              renderStageMode === "3D"
                ? "bg-indigo-500 text-white shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Box className="w-3 h-3" />
            3D
          </button>
          <button
            type="button"
            onClick={() => onSelectRenderStageMode("2D_SOUTHPARK")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
              renderStageMode === "2D_SOUTHPARK"
                ? "bg-amber-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Scissors className="w-3 h-3" />
            2D South Park
          </button>
        </div>

        {/* Contextual Floating Drawers Triggers */}
        <div className="flex items-center gap-1 pl-1 border-l border-white/10">
          <button
            type="button"
            onClick={() => onToggleDrawer("PUPPETEER")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition border cursor-pointer ${
              activeDrawer === "PUPPETEER"
                ? "bg-white/20 text-white border-cyan-400"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Rig IK/FK</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("INSPECTOR")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition border cursor-pointer ${
              activeDrawer === "INSPECTOR"
                ? "bg-white/20 text-white border-fuchsia-400"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <Network className="w-3 h-3 text-fuchsia-400" />
            <span className="hidden md:inline">Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("OUTPUTS")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition border cursor-pointer ${
              activeDrawer === "OUTPUTS"
                ? "bg-white/20 text-white border-emerald-400"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <Share2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">Outputs</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("VAULT")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition border cursor-pointer ${
              activeDrawer === "VAULT"
                ? "bg-amber-500/25 text-amber-200 border-amber-400"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span className="hidden md:inline">Vault</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono">
              {configuredKeysCount}/6
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
