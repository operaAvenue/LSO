import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-TV Studio Orchestrator — Google Stitch Spatial Broadcast UI",
  description:
    "Plataforma de Produção e Orquestração Visual de IA Generativa Multi-Agente (Marcus Vance, Maya Lin, Viktor K.) + ElevenLabs + Higgsfield",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
