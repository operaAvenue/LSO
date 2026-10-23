"use client";

import React, { useRef, useState } from "react";
import {
  Paperclip,
  Send,
  Loader2,
  Film,
  X,
  Wand2,
} from "lucide-react";

interface GeminiOmniBarProps {
  onProduce: (prompt: string, mediaFile: File | null) => Promise<void>;
  isProducing: boolean;
  timelineOpen: boolean;
}

const QUICK_PROMPTS = [
  "Plantão urgente: Vazamento de IA autônoma que assumiu o controle de 3 satélites de transmissão ao vivo",
  "Sátira estilo South Park: Reunião de executivos tentando substituir apresentadores por bonecos de cortiça",
  "Mesa Redonda explosiva: O fim das redes sociais tradicionais vs. agentes generativos em tempo real",
];

export default function GeminiOmniBar({
  onProduce,
  isProducing,
  timelineOpen,
}: GeminiOmniBarProps) {
  const [prompt, setPrompt] = useState<string>(QUICK_PROMPTS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProducing) return;
    await onProduce(prompt, selectedFile);
  };

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-40 w-[min(880px,94vw)] flex flex-col gap-1.5 transition-all duration-200 ${
        timelineOpen ? "bottom-[172px]" : "bottom-14"
      }`}
    >
      {/* Quick Prompt Chips */}
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {QUICK_PROMPTS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(q)}
              className="shrink-0 px-2.5 py-1 rounded-full theme-panel text-[11px] hover:opacity-90 flex items-center gap-1 transition cursor-pointer"
            >
              <Wand2 className="w-3 h-3" style={{ color: "var(--theme-accent)" }} />
              <span className="max-w-[230px] truncate">{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Media Pill */}
      {selectedFile && (
        <div className="self-start flex items-center gap-2 px-3 py-1 rounded-full theme-panel text-xs">
          <Film className="w-3.5 h-3.5" style={{ color: "var(--theme-accent)" }} />
          <span className="truncate max-w-[260px]">{selectedFile.name}</span>
          <span className="text-[10px]" style={{ color: "var(--theme-accent)" }}>
            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Gemini OmniBar Dock (Floating above Footer Timeline) */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2.5 px-4 py-2 theme-panel shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mp3,.wav,.webm,.m4a"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setSelectedFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar vídeo/áudio (.mp4, .mp3, .wav) para PiP & transcrição Whisper"
          className="p-2 rounded-2xl border transition cursor-pointer hover:opacity-85"
          style={{
            backgroundColor: "var(--theme-bg-2)",
            borderColor: "var(--theme-border)",
          }}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a pauta do programa, cole link/texto ou suba um vídeo para os 3 agentes produzirem..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--theme-text)" }}
        />

        <button
          type="submit"
          disabled={isProducing || !prompt.trim()}
          className="px-4 py-2 rounded-2xl theme-accent-bg hover:opacity-95 disabled:opacity-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition cursor-pointer"
        >
          {isProducing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Orquestrando...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Produzir Episódio</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
