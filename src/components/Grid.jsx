import { ARC_COLORS } from "../constants/colors";
import { dynamicCellSize } from "../utils/grid";

/**
 * Renders an ARC grid as a CSS-grid of colored cells (read-only).
 *
 * @param {number[][]} grid     – 2-D array of color indices (0–9)
 * @param {number}     cellSize – base cell size in px (auto-shrinks for large grids)
 * @param {string}     label    – optional caption shown above the grid
 * @param {boolean}    dimmed   – lower opacity (e.g. for inactive state)
 */
export default function Grid({ grid, cellSize = 18, label, dimmed }) {
  if (!grid || !grid.length) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const size = dynamicCellSize(rows, cols, cellSize);
  const gap = size > 10 ? 1 : 0;

  return (
    <div className="flex flex-col items-start" style={{ opacity: dimmed ? 0.4 : 1 }}>
      {label && (
        <span className="grid-cell-label mb-1">
          {label} <span className="dim">({rows}×{cols})</span>
        </span>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${rows}, ${size}px)`,
          gap: `${gap}px`,
          background: "#1a1a18",
          padding: gap ? "1px" : "0",
          borderRadius: "3px",
        }}
      >
        {grid.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                width: size,
                height: size,
                backgroundColor: ARC_COLORS[cell] ?? ARC_COLORS[0],
                borderRadius: size > 8 ? "1px" : "0",
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
