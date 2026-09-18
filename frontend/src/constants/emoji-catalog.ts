import compactData from "emojibase-data/en/compact.json";

interface CompactEmoji {
  hexcode: string; unicode: string; label: string; group?: number;
  order?: number; tags?: string[]; skins?: CompactEmoji[];
}
export interface PickerEmoji {
  id: string; emoji: string; label: string; group: number; search: string;
}

// Bundled Unicode17/CLDR48 data (MIT). No image/CDN/API is needed offline.
const data = [...compactData as CompactEmoji[]].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
export const EMOJI_CATALOG: PickerEmoji[] = data.flatMap(item =>
  [item, ...(item.skins || [])].map(variant => ({
    id: variant.hexcode, emoji: variant.unicode, label: variant.label,
    group: variant.group ?? item.group ?? 8,
    search: `${variant.unicode} ${variant.label} ${(item.tags || []).join(" ")}`.toLowerCase(),
  })),
);
export const EMOJI_CATEGORIES = [
  { id: -1, label: "All" }, { id: 0, label: "Smileys" },
  { id: 1, label: "People" }, { id: 2, label: "Components" },
  { id: 3, label: "Nature" }, { id: 4, label: "Food" },
  { id: 5, label: "Travel" }, { id: 6, label: "Activities" },
  { id: 7, label: "Objects" }, { id: 8, label: "Symbols" },
  { id: 9, label: "Flags" },
];