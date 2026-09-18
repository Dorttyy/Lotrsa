// LinguaConnect design tokens — refined Light & Dark palettes with unified
// purple accents, chat-bubble semantics and voice-message tokens.
// Both palettes share the same shape so screens can swap themes freely.
export interface ThemeColors {
  // Base surfaces
  surface: string;
  onSurface: string;
  surfaceSecondary: string;
  onSurfaceSecondary: string;
  surfaceTertiary: string;
  onSurfaceTertiary: string;

  // Brand / primary accent (purple)
  brand: string;
  onBrand: string;
  brandSecondary: string;
  onBrandSecondary: string;
  brandTertiary: string;
  onBrandTertiary: string;

  // Semantic
  success: string;
  warning: string;
  error: string;

  // Structure
  border: string;
  borderStrong: string;
  divider: string;

  // Chat bubbles
  bubbleMine: string;
  onBubbleMine: string;
  bubbleTheirs: string;
  onBubbleTheirs: string;
  bubbleMeta: string;

  // Voice message
  waveActive: string;
  waveInactive: string;
  speedPillBg: string;
  speedPillText: string;

  // Content card tints — cycled through for feed variety (Moments feed).
  // 6 subtle pastel/tinted surfaces so consecutive cards feel distinct while
  // still respecting the mode's overall palette.
  cardTints: [string, string, string, string, string, string];
}

// Light — clean white with subtle sage-tinted secondary surfaces, soft mint
// own-bubble, near-black green-tinted text. Accent is a rich botanical
// emerald that unifies voice, badges, reactions, waveforms and interactive
// states.
export const lightColors: ThemeColors = {
  surface: "#FFFFFF",
  onSurface: "#0F1720",
  surfaceSecondary: "#F1F5F9",
  onSurfaceSecondary: "#5B6B7A",
  surfaceTertiary: "#E6EEF5",
  onSurfaceTertiary: "#2A3540",

  brand: "#0E9AE0",
  onBrand: "#FFFFFF",
  brandSecondary: "#E2F3FC",
  onBrandSecondary: "#0A6B9E",
  brandTertiary: "#F0F9FE",
  onBrandTertiary: "#0E9AE0",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",

  border: "#E2E9F0",
  borderStrong: "#C6D3DF",
  divider: "#EEF2F7",

  bubbleMine: "#E2F3FC",
  onBubbleMine: "#0A3A55",
  bubbleTheirs: "#F1F5F9",
  onBubbleTheirs: "#0F1720",
  bubbleMeta: "#5B6B7A",

  waveActive: "#0E9AE0",
  waveInactive: "#A9DAF2",
  speedPillBg: "#FFFFFF",
  speedPillText: "#0E9AE0",

  cardTints: [
    "#FFFFFF", // clean white
    "#FFFDF5", // warm cream
    "#F0F9FE", // sky blue
    "#F1F7FC", // pale azure
    "#FCF6F5", // rose
    "#E2F3FC", // soft blue
  ],
};

// Dark — deep forest near-black background, deep-emerald own bubbles,
// dark-gray-green received bubbles, high-contrast off-white text. Glowing
// mint accent for interactive states so it stays readable against the dark
// surface.
export const darkColors: ThemeColors = {
  surface: "#0B1220",
  onSurface: "#EAF1F8",
  surfaceSecondary: "#131C2B",
  onSurfaceSecondary: "#9AACC0",
  surfaceTertiary: "#1E2A3C",
  onSurfaceTertiary: "#D3DEEA",

  brand: "#38B6F1",
  onBrand: "#041E2E",
  brandSecondary: "#0B3B58",
  onBrandSecondary: "#7FD1F5",
  brandTertiary: "#10293B",
  onBrandTertiary: "#38B6F1",

  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",

  border: "#223044",
  borderStrong: "#38495F",
  divider: "#16202D",

  bubbleMine: "#0B3B58",
  onBubbleMine: "#D1EEFB",
  bubbleTheirs: "#17212E",
  onBubbleTheirs: "#EAF1F8",
  bubbleMeta: "#8CA0B6",

  waveActive: "#38B6F1",
  waveInactive: "#0F4E6E",
  speedPillBg: "#0F2E42",
  speedPillText: "#38B6F1",

  cardTints: [
    "#131C2B", // default dark navy
    "#1C1813", // slightly warm
    "#12202E", // sky-tinged
    "#141F2D", // azure-tinged
    "#1C1516", // rose-tinged
    "#0F2E42", // deep blue
  ],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

// Gender marks intentionally keep the same identity colours in both themes.
export const genderColors = {
  male: "#3B82F6",
  female: "#EC4899",
  maleBackground: "#3B82F626",
  femaleBackground: "#EC489926",
} as const;

export const fonts = {
  // HelloTalk-style clean typography — Inter for both display headings and
  // body text. Weight scale: 400 (regular), 500 (medium), 600 (semibold),
  // 700 (bold). Display uses the heavier end so titles/names stand out.
  display: "Inter_700Bold",
  displaySemi: "Inter_600SemiBold",
  displayBold: "Inter_700Bold",
  text: "Inter_400Regular",
  textSemi: "Inter_500Medium",
  textBold: "Inter_600SemiBold",
};

export const shadow = {
  card: {
    boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.08)",
  },
};
