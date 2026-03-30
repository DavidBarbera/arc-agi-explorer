/**
 * Tools available in the solution grid editor.
 * Each tool changes how mouse interactions behave on the editable grid.
 */
export const TOOLS = [
  { id: "paint", icon: "✏️", tip: "Paint — click or drag to color cells" },
  { id: "select", icon: "⬚", tip: "Select — drag to create a rectangular selection" },
  { id: "fill", icon: "🪣", tip: "Fill — fill a selection or single cell with active color" },
  { id: "flood", icon: "💧", tip: "Flood — fill a contiguous same-colored region" },
];
