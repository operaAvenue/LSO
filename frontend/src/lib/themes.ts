export type ThemeCategory = "LIGHT_PASTEL" | "DARK_PASTEL";

export interface AppThemeConfig {
  id: string;
  name: string;
  category: ThemeCategory;
  description?: string;
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  textPrimary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentText: string;
  borderHex: string;
  surfaceOpacity: number; // 0.35 to 0.98
  blurPx: number; // 0 to 40
  borderRadiusPx: number; // 4 to 28
  borderAlpha: number; // 0.08 to 0.45
  uiScale: number; // 0.9 to 1.12
  syncStageBackground: boolean;
}

export const THEME_PRESETS: AppThemeConfig[] = [
  // ==========================================================================
  // PASTÉIS CLAROS (LIGHT PASTEL PALETTES)
  // ==========================================================================
  {
    id: "pastel_light_lavender",
    name: "🌸 Lavanda & Nuvem Pastel",
    category: "LIGHT_PASTEL",
    bgPrimary: "#f4f1f8",
    bgSecondary: "#e9e2f3",
    bgSurface: "#ffffff",
    textPrimary: "#2b2338",
    textMuted: "#6e6282",
    accentPrimary: "#9b87f5",
    accentSecondary: "#f2a6c6",
    accentText: "#ffffff",
    borderHex: "#bcace6",
    surfaceOpacity: 0.88,
    blurPx: 22,
    borderRadiusPx: 18,
    borderAlpha: 0.32,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_light_mint",
    name: "🌿 Menta & Sálvia Suave",
    category: "LIGHT_PASTEL",
    bgPrimary: "#eef7f4",
    bgSecondary: "#dceee8",
    bgSurface: "#f9fdfb",
    textPrimary: "#1d352e",
    textMuted: "#56786e",
    accentPrimary: "#56b898",
    accentSecondary: "#8fd3be",
    accentText: "#0f2921",
    borderHex: "#9acbb9",
    surfaceOpacity: 0.9,
    blurPx: 20,
    borderRadiusPx: 18,
    borderAlpha: 0.3,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_light_peach",
    name: "🍑 Pêssego & Algodão Doce",
    category: "LIGHT_PASTEL",
    bgPrimary: "#fdf4f0",
    bgSecondary: "#fae5dc",
    bgSurface: "#fffaf8",
    textPrimary: "#3b231e",
    textMuted: "#825c54",
    accentPrimary: "#f28b73",
    accentSecondary: "#f7b58c",
    accentText: "#ffffff",
    borderHex: "#e8b9ab",
    surfaceOpacity: 0.9,
    blurPx: 22,
    borderRadiusPx: 20,
    borderAlpha: 0.32,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_light_sky",
    name: "☁️ Céu de Verão Pastel",
    category: "LIGHT_PASTEL",
    bgPrimary: "#eff6fc",
    bgSecondary: "#ddebf8",
    bgSurface: "#ffffff",
    textPrimary: "#1b2e42",
    textMuted: "#5b7691",
    accentPrimary: "#68a8e8",
    accentSecondary: "#a29bfe",
    accentText: "#ffffff",
    borderHex: "#a3c6e8",
    surfaceOpacity: 0.88,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.3,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_light_matcha",
    name: "🍵 Matcha & Baunilha",
    category: "LIGHT_PASTEL",
    bgPrimary: "#f7f6ee",
    bgSecondary: "#ecead8",
    bgSurface: "#fdfcf7",
    textPrimary: "#2e3324",
    textMuted: "#6c735c",
    accentPrimary: "#84a970",
    accentSecondary: "#d9b478",
    accentText: "#ffffff",
    borderHex: "#bfc7ae",
    surfaceOpacity: 0.9,
    blurPx: 18,
    borderRadiusPx: 16,
    borderAlpha: 0.32,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_light_rose_quartz",
    name: "🌷 Rosa Quartzo & Pérola",
    category: "LIGHT_PASTEL",
    bgPrimary: "#fbf2f5",
    bgSecondary: "#f5e1e9",
    bgSurface: "#ffffff",
    textPrimary: "#3a212b",
    textMuted: "#7f5b69",
    accentPrimary: "#e384a5",
    accentSecondary: "#b392ec",
    accentText: "#ffffff",
    borderHex: "#e3b8c8",
    surfaceOpacity: 0.89,
    blurPx: 22,
    borderRadiusPx: 20,
    borderAlpha: 0.3,
    uiScale: 1.0,
    syncStageBackground: true,
  },

  // ==========================================================================
  // PASTÉIS ESCUROS (DARK PASTEL PALETTES)
  // ==========================================================================
  {
    id: "pastel_dark_dusk_lavender",
    name: "🌙 Noite Lavanda Pastel",
    category: "DARK_PASTEL",
    bgPrimary: "#181523",
    bgSecondary: "#221e30",
    bgSurface: "#262136",
    textPrimary: "#f3eefc",
    textMuted: "#a99ec2",
    accentPrimary: "#b8a1ff",
    accentSecondary: "#f4a9c7",
    accentText: "#181523",
    borderHex: "#9b87f5",
    surfaceOpacity: 0.86,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.24,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_dark_seafoam_slate",
    name: "🌊 Abismo Menta & Ardósia",
    category: "DARK_PASTEL",
    bgPrimary: "#131c1e",
    bgSecondary: "#1b282b",
    bgSurface: "#1f2e32",
    textPrimary: "#eaf7f5",
    textMuted: "#92b3ae",
    accentPrimary: "#80e0c6",
    accentSecondary: "#f7b799",
    accentText: "#10211d",
    borderHex: "#73ccb4",
    surfaceOpacity: 0.86,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.24,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_dark_plum_rose",
    name: "🍷 Ameixa & Rosa Antigo",
    category: "DARK_PASTEL",
    bgPrimary: "#1f151b",
    bgSecondary: "#2c1e26",
    bgSurface: "#32222b",
    textPrimary: "#fbeaf0",
    textMuted: "#bda0ab",
    accentPrimary: "#f29bb6",
    accentSecondary: "#f7c597",
    accentText: "#241319",
    borderHex: "#d989a3",
    surfaceOpacity: 0.87,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.25,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_dark_nordic_ocean",
    name: "🌌 Oceano Boreal Pastel",
    category: "DARK_PASTEL",
    bgPrimary: "#121926",
    bgSecondary: "#1a2436",
    bgSurface: "#1e2a3f",
    textPrimary: "#edf4fc",
    textMuted: "#95aac4",
    accentPrimary: "#8cc0f9",
    accentSecondary: "#c4a7ff",
    accentText: "#101a29",
    borderHex: "#78ace6",
    surfaceOpacity: 0.86,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.24,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "pastel_dark_moss_amber",
    name: "🌲 Musgo Escuro & Manteiga",
    category: "DARK_PASTEL",
    bgPrimary: "#161c16",
    bgSecondary: "#202920",
    bgSurface: "#253025",
    textPrimary: "#f1f6ef",
    textMuted: "#9eb09b",
    accentPrimary: "#a5d69c",
    accentSecondary: "#f5d491",
    accentText: "#162114",
    borderHex: "#8ebf86",
    surfaceOpacity: 0.87,
    blurPx: 22,
    borderRadiusPx: 16,
    borderAlpha: 0.24,
    uiScale: 1.0,
    syncStageBackground: true,
  },
  {
    id: "cyber_broadcast_dark",
    name: "⚡ Cyber Broadcast Original",
    category: "DARK_PASTEL",
    bgPrimary: "#05070f",
    bgSecondary: "#090d1c",
    bgSurface: "#090d1a",
    textPrimary: "#f8fafc",
    textMuted: "#94a3b8",
    accentPrimary: "#22d3ee",
    accentSecondary: "#d946ef",
    accentText: "#020617",
    borderHex: "#38bdf8",
    surfaceOpacity: 0.86,
    blurPx: 24,
    borderRadiusPx: 18,
    borderAlpha: 0.2,
    uiScale: 1.0,
    syncStageBackground: false,
  },
];

export const DEFAULT_THEME_CONFIG: AppThemeConfig = THEME_PRESETS[6]; // Noite Lavanda Pastel by default

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(30, 41, 59, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
