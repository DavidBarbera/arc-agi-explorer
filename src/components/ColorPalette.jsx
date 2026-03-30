import { ARC_COLORS } from "../constants/colors";

/**
 * Horizontal strip of the 10 ARC colors.
 * Clicking a swatch sets the active color index.
 */
export default function ColorPalette({ activeColor, setActiveColor }) {
  return (
    <div className="flex items-center gap-1">
      {ARC_COLORS.map((clr, i) => (
        <button
          key={i}
          onClick={() => setActiveColor(i)}
          className="rounded-sm transition-transform"
          style={{
            width: 26,
            height: 26,
            backgroundColor: clr,
            border:
              activeColor === i
                ? "2px solid var(--accent-yellow)"
                : "2px solid var(--border-default)",
            transform: activeColor === i ? "scale(1.2)" : "scale(1)",
            boxShadow: activeColor === i ? "0 0 8px #ffe56644" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: i === 0 ? "#555" : "#000",
              mixBlendMode: "difference",
              fontSize: "9px",
              fontWeight: 700,
            }}
          >
            {i}
          </span>
        </button>
      ))}
    </div>
  );
}
