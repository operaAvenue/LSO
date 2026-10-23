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
  Palette,
  Sun,
  Moon,
} from "lucide-react";
import { LLMProvider, TVProgramType } from "@/lib/api";
import { AppThemeConfig } from "@/lib/themes";
import { StudioEditorTab } from "./StudioEditorDrawer";

export type WorkspaceLayoutMode = "STAGE" | "GRAPH" | "SPLIT";
export type RenderStageMode = "3D" | "2D_SOUTHPARK";
export type ActiveDrawerType =
  | null
  | "PUPPETEER"
  | "INSPECTOR"
  | "OUTPUTS"
  | "VAULT"
  | "THEME";

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
  themeConfig: AppThemeConfig;
  onQuickToggleCategory: () => void;
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
  themeConfig,
  onQuickToggleCategory,
}: TopStitchPillProps) {
  const configuredKeysCount = Object.values(providerStatus).filter(Boolean).length;
  const isLight = themeConfig.category === "LIGHT_PASTEL";

  return (
    <header className="fixed top-0 left-0 right-0 w-screen z-40 theme-bar border-b shadow-[0_8px_32px_rgba(0,0,0,0.3)] select-none transition-colors duration-200">
      <div className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left Section: Brand + Studio 3D/2D Editor + Projects + Program + LLM */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Identity */}
          <div
            className="flex items-center gap-2 pr-3 border-r"
            style={{ borderColor: "var(--theme-border)" }}
          >
            <div className="w-7 h-7 rounded-xl theme-accent-bg flex items-center justify-center shadow-sm">
              <Tv className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-extrabold tracking-wider uppercase hidden sm:inline">
              AI-TV Studio
            </span>
          </div>

          {/* Studio Scene & Character Editor Trigger */}
          <button
            type="button"
            onClick={() => onOpenStudioEditorTab("OBJECTS")}
            style={
              studioEditorOpen
                ? {
                    backgroundColor: "var(--theme-accent)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition border cursor-pointer hover:opacity-90"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Editor 3D/2D & Elenco</span>
          </button>

          {/* Save / Load Projects Trigger */}
          <button
            type="button"
            onClick={() => onOpenStudioEditorTab("PROJECTS")}
            style={{ borderColor: "var(--theme-border)" }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 bg-black/10 hover:bg-black/20 border transition cursor-pointer"
          >
            <FolderKanban
              className="w-3.5 h-3.5"
              style={{ color: "var(--theme-accent-2)" }}
            />
            <span className="hidden md:inline">Projetos</span>
          </button>

          {/* TV Program Selector */}
          <div
            style={{ borderColor: "var(--theme-border)" }}
            className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-xl border"
          >
            <Sparkles
              className="w-3.5 h-3.5"
              style={{ color: "var(--theme-accent)" }}
            />
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
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: "var(--theme-text)" }}
            >
              {PROGRAMS.map((p) => (
                <option
                  key={p}
                  value={p}
                  style={{
                    backgroundColor: "var(--theme-surface-solid)",
                    color: "var(--theme-text)",
                  }}
                >
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* LLM Engine Selector */}
          <div
            style={{ borderColor: "var(--theme-border)" }}
            className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-xl border"
          >
            <Cpu
              className="w-3.5 h-3.5"
              style={{ color: "var(--theme-accent-2)" }}
            />
            <select
              aria-label="Selecionar Motor LLM"
              value={llmProvider}
              onChange={(e) => onSelectLlm(e.target.value as LLMProvider)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: "var(--theme-text)" }}
            >
              {LLM_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{
                    backgroundColor: "var(--theme-surface-solid)",
                    color: "var(--theme-text)",
                  }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Section: Workspace View Mode + 3D vs 2D South Park Toggle */}
        <div className="flex items-center gap-2">
          <div
            style={{ borderColor: "var(--theme-border)" }}
            className="flex items-center bg-black/15 p-0.5 rounded-xl border"
          >
            {(
              [
                { id: "STAGE", label: "Palco" },
                { id: "SPLIT", label: "50/50", icon: Columns2 },
                { id: "GRAPH", label: "Nodes" },
              ] as const
            ).map((m) => {
              const Icon = "icon" in m ? m.icon : null;
              const active = layoutMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectLayoutMode(m.id)}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--theme-accent)",
                          color: "var(--theme-accent-text)",
                        }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    active ? "shadow-sm" : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div
            style={{ borderColor: "var(--theme-border)" }}
            className="flex items-center bg-black/15 p-0.5 rounded-xl border"
          >
            <button
              type="button"
              onClick={() => onSelectRenderStageMode("3D")}
              style={
                renderStageMode === "3D"
                  ? {
                      backgroundColor: "var(--theme-accent)",
                      color: "var(--theme-accent-text)",
                    }
                  : undefined
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                renderStageMode === "3D"
                  ? "shadow-sm"
                  : "opacity-75 hover:opacity-100"
              }`}
            >
              <Box className="w-3 h-3" />
              <span>3D Studio</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectRenderStageMode("2D_SOUTHPARK")}
              style={
                renderStageMode === "2D_SOUTHPARK"
                  ? {
                      backgroundColor: "var(--theme-accent-2)",
                      color: "var(--theme-accent-text)",
                    }
                  : undefined
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                renderStageMode === "2D_SOUTHPARK"
                  ? "shadow-sm"
                  : "opacity-75 hover:opacity-100"
              }`}
            >
              <Scissors className="w-3 h-3" />
              <span>2D South Park</span>
            </button>
          </div>
        </div>

        {/* Right Section: Rig IK/FK, Inspector, Outputs, Theme & Palettes, API Vault */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleDrawer("PUPPETEER")}
            style={
              activeDrawer === "PUPPETEER"
                ? {
                    backgroundColor: "var(--theme-accent)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition border bg-black/10 hover:bg-black/20 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Rig IK/FK</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("INSPECTOR")}
            style={
              activeDrawer === "INSPECTOR"
                ? {
                    backgroundColor: "var(--theme-accent)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition border bg-black/10 hover:bg-black/20 cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("OUTPUTS")}
            style={
              activeDrawer === "OUTPUTS"
                ? {
                    backgroundColor: "var(--theme-accent)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition border bg-black/10 hover:bg-black/20 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Outputs</span>
          </button>

          {/* Quick 1-Click Light Pastel / Dark Pastel Switch + Full Theme Studio Drawer */}
          <button
            type="button"
            onClick={onQuickToggleCategory}
            title="Alternar rapidamente entre Pastel Claro e Pastel Escuro"
            style={{ borderColor: "var(--theme-border)" }}
            className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 border transition cursor-pointer"
          >
            {isLight ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("THEME")}
            style={
              activeDrawer === "THEME"
                ? {
                    backgroundColor: "var(--theme-accent-2)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent-2)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition border bg-black/10 hover:bg-black/20 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Temas & Paletas</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDrawer("VAULT")}
            style={
              activeDrawer === "VAULT"
                ? {
                    backgroundColor: "var(--theme-accent)",
                    color: "var(--theme-accent-text)",
                    borderColor: "var(--theme-accent)",
                  }
                : { borderColor: "var(--theme-border)" }
            }
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition border bg-black/10 hover:bg-black/20 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Vault</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-mono">
              {configuredKeysCount}/6
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
