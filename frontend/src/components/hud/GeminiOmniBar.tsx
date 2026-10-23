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
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-[11px] text-slate-300 hover:text-cyan-300 flex items-center gap-1 backdrop-blur-xl transition cursor-pointer"
            >
              <Wand2 className="w-3 h-3 text-cyan-400" />
              <span className="max-w-[230px] truncate">{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Media Pill */}
      {selectedFile && (
        <div className="self-start flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/85 border border-cyan-400/40 text-xs text-cyan-200 backdrop-blur-xl">
          <Film className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[260px]">{selectedFile.name}</span>
          <span className="text-[10px] text-cyan-400">
            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Gemini OmniBar Dock (Floating above Footer Timeline) */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2.5 px-4 py-2 rounded-3xl bg-slate-950/88 backdrop-blur-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] focus-within:border-cyan-400/60 transition"
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
          className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a pauta do programa, cole link/texto ou suba um vídeo para os 3 agentes produzirem..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={isProducing || !prompt.trim()}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:opacity-95 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 shadow-lg transition cursor-pointer"
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
