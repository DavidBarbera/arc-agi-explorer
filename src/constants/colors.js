/**
 * The 10 ARC-AGI colors (indices 0–9).
 * Each grid cell is an integer mapping to one of these.
 */
export const ARC_COLORS = [
  "#0d0d0d", // 0 — black
  "#1e93ff", // 1 — blue
  "#ef4437", // 2 — red
  "#30cf57", // 3 — green
  "#ffd33b", // 4 — yellow
  "#8d8d8d", // 5 — grey
  "#e829e8", // 6 — magenta
  "#ff8a28", // 7 — orange
  "#62d8f5", // 8 — cyan
  "#921231", // 9 — maroon
];

/** Slightly darker borders per color — useful for cell outlines. */
export const ARC_BORDERS = [
  "#2a2a2a",
  "#1674cc",
  "#c4362d",
  "#27a847",
  "#ccaa30",
  "#6e6e6e",
  "#b821b8",
  "#cc6e20",
  "#4eadc4",
  "#741028",
];

/** Total number of ARC colors. */
export const COLOR_COUNT = ARC_COLORS.length;
