import { useState, useCallback, useEffect, useRef } from "react";
import { ARC_COLORS } from "../constants/colors";
import { dynamicCellSize, gridToClipboard, gridToExcalidrawClipboard, extractSubGrid } from "../utils/grid";

/**
 * Renders an ARC grid as a CSS-grid of colored cells.
 *
 * Interactive features for the abstraction workflow:
 *   – Hover shows a 📋 button → copies the full grid as PNG to clipboard
 *   – Shift + drag selects a rectangular sub-region (yellow outline)
 *   – When a selection exists, "Copy selection" copies just that piece
 *   – Paste the result straight into Excalidraw / any image tool
 */
export default function Grid({ grid, cellSize = 18, label, dimmed }) {
  if (!grid || !grid.length) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const size = dynamicCellSize(rows, cols, cellSize);
  const gap = size > 10 ? 1 : 0;

  const [hovered, setHovered] = useState(false);
  const [copiedAs, setCopiedAs] = useState(null); // "png" | "excalidraw" | null
  const [selection, setSelection] = useState(null); // { r1, c1, r2, c2 }
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const wrapperRef = useRef(null);

  const flash = (type) => {
    setCopiedAs(type);
    setTimeout(() => setCopiedAs(null), 1200);
  };

  /* ── Copy full grid ── */
  const copyFullPng = useCallback(async (e) => {
    e.stopPropagation();
    if (await gridToClipboard(grid, 20, 1)) flash("png");
  }, [grid]);

  const copyFullExcalidraw = useCallback(async (e) => {
    e.stopPropagation();
    if (await gridToExcalidrawClipboard(grid, 30, 2)) flash("excalidraw");
  }, [grid]);

  /* ── Copy selection ── */
  const copySelPng = useCallback(async (e) => {
    e.stopPropagation();
    if (!selection) return;
    const sub = extractSubGrid(grid, selection);
    if (await gridToClipboard(sub, 20, 1)) flash("png");
  }, [grid, selection]);

  const copySelExcalidraw = useCallback(async (e) => {
    e.stopPropagation();
    if (!selection) return;
    const sub = extractSubGrid(grid, selection);
    if (await gridToExcalidrawClipboard(sub, 30, 2)) flash("excalidraw");
  }, [grid, selection]);

  /* ── Clear selection ── */
  const clearSelection = useCallback((e) => {
    e.stopPropagation();
    setSelection(null);
  }, []);

  /* ── Shift+drag for sub-region ── */
  const liveRect = (() => {
    if (selection) return selection;
    if (!dragStart || !dragEnd) return null;
    return {
      r1: Math.min(dragStart.r, dragEnd.r),
      r2: Math.max(dragStart.r, dragEnd.r),
      c1: Math.min(dragStart.c, dragEnd.c),
      c2: Math.max(dragStart.c, dragEnd.c),
    };
  })();

  const inRect = (r, c) =>
    liveRect && r >= liveRect.r1 && r <= liveRect.r2 && c >= liveRect.c1 && c <= liveRect.c2;

  const handleCellMouseDown = (r, c, e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ r, c });
    setDragEnd({ r, c });
    setSelection(null);
  };

  const handleCellMouseEnter = (r, c) => {
    if (dragging) setDragEnd({ r, c });
  };

  const handleMouseUp = useCallback(() => {
    if (dragging && dragStart && dragEnd) {
      const rect = {
        r1: Math.min(dragStart.r, dragEnd.r),
        r2: Math.max(dragStart.r, dragEnd.r),
        c1: Math.min(dragStart.c, dragEnd.c),
        c2: Math.max(dragStart.c, dragEnd.c),
      };
      // Only set selection if it's more than a single cell
      if (rect.r1 !== rect.r2 || rect.c1 !== rect.c2) {
        setSelection(rect);
      }
    }
    setDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [dragging, dragStart, dragEnd]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const selectionDims = selection
    ? `${selection.r2 - selection.r1 + 1}×${selection.c2 - selection.c1 + 1}`
    : null;

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col items-start"
      style={{ opacity: dimmed ? 0.4 : 1, position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Label row ── */}
      {label && (
        <span className="grid-cell-label mb-1">
          {label} <span className="dim">({rows}×{cols})</span>
        </span>
      )}

      {/* ── Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${rows}, ${size}px)`,
          gap: `${gap}px`,
          background: "#1a1a18",
          padding: gap ? "1px" : "0",
          borderRadius: "3px",
          position: "relative",
          cursor: "crosshair",
          userSelect: "none",
        }}
      >
        {grid.map((row, ri) =>
          row.map((cell, ci) => {
            const selected = inRect(ri, ci);
            return (
              <div
                key={`${ri}-${ci}`}
                onMouseDown={(e) => handleCellMouseDown(ri, ci, e)}
                onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                style={{
                  width: size,
                  height: size,
                  backgroundColor: ARC_COLORS[cell] ?? ARC_COLORS[0],
                  borderRadius: size > 8 ? "1px" : "0",
                  outline: selected ? "2px solid #ffe566" : "none",
                  outlineOffset: "-1px",
                  zIndex: selected ? 2 : 1,
                  position: "relative",
                }}
              />
            );
          })
        )}
      </div>

      {/* ── Action buttons (visible on hover or when selection exists) ── */}
      {(hovered || selection) && (
        <div
          className="flex items-center gap-1 mt-1 flex-wrap"
          style={{ minHeight: 20 }}
        >
          {copiedAs && (
            <span style={{ fontSize: 10, color: "var(--accent-green-bright)", marginRight: 2 }}>
              ✓ Copied{copiedAs === "excalidraw" ? " (paste in Excalidraw)" : ""}
            </span>
          )}

          {!copiedAs && !selection && (
            <>
              <CopyBtn onClick={copyFullExcalidraw} title="Copy as Excalidraw objects — paste as editable cells" accent>
                📐 Excalidraw
              </CopyBtn>
              <CopyBtn onClick={copyFullPng} title="Copy as PNG image">
                📋 PNG
              </CopyBtn>
              <span style={{ fontSize: 9, color: "var(--text-dimmed)", marginLeft: 2 }}>
                shift+drag to select
              </span>
            </>
          )}

          {!copiedAs && selection && (
            <>
              <CopyBtn onClick={copySelExcalidraw} title="Copy selection as Excalidraw objects" accent>
                📐 {selectionDims}
              </CopyBtn>
              <CopyBtn onClick={copySelPng} title="Copy selection as PNG">
                📋 {selectionDims}
              </CopyBtn>
              <CopyBtn onClick={clearSelection} dim title="Clear selection">
                ✕
              </CopyBtn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tiny button helper ── */
function CopyBtn({ onClick, title, accent, dim, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 3,
        background: accent ? "#2a2a18" : "var(--bg-raised)",
        color: dim ? "var(--text-dimmed)" : accent ? "var(--accent-yellow)" : "var(--text-secondary)",
        border: accent ? "1px solid #5a5a28" : "1px solid var(--border-default)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
