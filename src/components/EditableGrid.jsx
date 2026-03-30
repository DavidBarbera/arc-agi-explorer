import { useState, useEffect, useCallback } from "react";
import { ARC_COLORS } from "../constants/colors";
import { deepCopy, dynamicCellSize, floodFill } from "../utils/grid";

/**
 * Interactive grid editor. Supports three tools via the `tool` prop:
 *   "paint"  – click/drag to set cells to activeColor
 *   "select" – drag to create a rectangular selection
 *   "fill"   – click to fill a selection (or single cell) with activeColor
 *   "flood"  – click to flood-fill a contiguous same-colored region
 */
export default function EditableGrid({
  grid,
  setGrid,
  cellSize = 22,
  activeColor,
  tool,
  selection,
  setSelection,
}) {
  const rows = grid.length;
  const cols = grid[0].length;
  const size = dynamicCellSize(rows, cols, cellSize, 480);
  const gap = size > 10 ? 1 : 0;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [paintMode, setPaintMode] = useState(false);

  /* ── Compute live selection rectangle ── */
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
    liveRect &&
    r >= liveRect.r1 &&
    r <= liveRect.r2 &&
    c >= liveRect.c1 &&
    c <= liveRect.c2;

  /* ── Mouse handlers ── */
  const handleMouseDown = (r, c, e) => {
    e.preventDefault();

    if (tool === "paint") {
      setPaintMode(true);
      const ng = deepCopy(grid);
      ng[r][c] = activeColor;
      setGrid(ng);
    } else if (tool === "select") {
      setIsDragging(true);
      setDragStart({ r, c });
      setDragEnd({ r, c });
      setSelection(null);
    } else if (tool === "fill") {
      if (liveRect && inRect(r, c)) {
        // fill entire selection
        const ng = deepCopy(grid);
        for (let ri = liveRect.r1; ri <= liveRect.r2; ri++)
          for (let ci = liveRect.c1; ci <= liveRect.c2; ci++) ng[ri][ci] = activeColor;
        setGrid(ng);
      } else {
        // fill single cell
        const ng = deepCopy(grid);
        ng[r][c] = activeColor;
        setGrid(ng);
      }
    } else if (tool === "flood") {
      const ng = deepCopy(grid);
      floodFill(ng, r, c, activeColor);
      setGrid(ng);
    }
  };

  const handleMouseEnter = (r, c) => {
    if (paintMode && tool === "paint") {
      const ng = deepCopy(grid);
      ng[r][c] = activeColor;
      setGrid(ng);
    }
    if (isDragging && tool === "select") {
      setDragEnd({ r, c });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging && tool === "select" && dragStart && dragEnd) {
      setSelection({
        r1: Math.min(dragStart.r, dragEnd.r),
        r2: Math.max(dragStart.r, dragEnd.r),
        c1: Math.min(dragStart.c, dragEnd.c),
        c2: Math.max(dragStart.c, dragEnd.c),
      });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setPaintMode(false);
  }, [isDragging, tool, dragStart, dragEnd, setSelection]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridTemplateRows: `repeat(${rows}, ${size}px)`,
        gap: `${gap}px`,
        background: "#1a1a18",
        padding: gap ? "1px" : "0",
        borderRadius: "3px",
        userSelect: "none",
      }}
    >
      {grid.map((row, ri) =>
        row.map((cell, ci) => {
          const selected = inRect(ri, ci);
          return (
            <div
              key={`${ri}-${ci}`}
              onMouseDown={(e) => handleMouseDown(ri, ci, e)}
              onMouseEnter={() => handleMouseEnter(ri, ci)}
              style={{
                width: size,
                height: size,
                backgroundColor: ARC_COLORS[cell] ?? ARC_COLORS[0],
                borderRadius: size > 8 ? "1px" : "0",
                cursor: "crosshair",
                outline: selected ? "2px solid var(--accent-yellow)" : "none",
                outlineOffset: "-1px",
                zIndex: selected ? 2 : 1,
                position: "relative",
              }}
            />
          );
        })
      )}
    </div>
  );
}
