import { useState, useEffect, useCallback, useRef } from "react";
import EditableGrid from "./EditableGrid";
import ColorPalette from "./ColorPalette";
import { TOOLS } from "../constants/tools";
import { deepCopy, makeGrid } from "../utils/grid";

/**
 * Full solution-editing panel with:
 *   – Grid resize controls (1–30 rows/cols)
 *   – Tool selector (paint / select / fill)
 *   – Copy, Paste, Fill-selection actions + keyboard shortcuts
 *   – Ctrl+C  → copy selection
 *   – Ctrl+V  → paste at selection origin
 *   – Ctrl+Z  → undo last grid change
 *   – Copy-from-input shortcut
 *   – Color palette
 *   – Editable grid canvas
 *   – Save / Cancel buttons
 */
export default function SolutionEditor({ initialGrid, inputGrid, onSave, onCancel }) {
  const defaultRows = initialGrid?.length ?? inputGrid?.length ?? 5;
  const defaultCols = initialGrid?.[0]?.length ?? inputGrid?.[0]?.length ?? 5;

  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [grid, setGrid] = useState(
    initialGrid ? deepCopy(initialGrid) : makeGrid(defaultRows, defaultCols)
  );
  const [activeColor, setActiveColor] = useState(1);
  const [tool, setTool] = useState("paint");
  const [selection, setSelection] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  /* ── Undo history ── */
  const historyRef = useRef([]);
  const MAX_HISTORY = 50;

  /** Wrap setGrid to push current state onto undo stack. */
  const setGridWithHistory = useCallback(
    (newGrid) => {
      setGrid((prev) => {
        historyRef.current.push(deepCopy(prev));
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        return newGrid;
      });
    },
    []
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop();
    setGrid(prev);
    setRows(prev.length);
    setCols(prev[0].length);
  }, []);

  /* ── Resize grid, preserving existing content ── */
  const resize = (nr, nc) => {
    const ng = makeGrid(nr, nc);
    for (let r = 0; r < Math.min(nr, grid.length); r++)
      for (let c = 0; c < Math.min(nc, grid[0].length); c++) ng[r][c] = grid[r][c];
    setGridWithHistory(ng);
    setRows(nr);
    setCols(nc);
    setSelection(null);
  };

  /* ── Clipboard operations ── */
  const copySelection = useCallback(() => {
    if (!selection) return;
    const { r1, r2, c1, c2 } = selection;
    const clip = [];
    for (let r = r1; r <= r2; r++) {
      const row = [];
      for (let c = c1; c <= c2; c++) row.push(grid[r][c]);
      clip.push(row);
    }
    setClipboard(clip);
  }, [selection, grid]);

  const pasteAtSelection = useCallback(() => {
    if (!clipboard || !selection) return;
    const ng = deepCopy(grid);
    for (let r = 0; r < clipboard.length && selection.r1 + r < rows; r++)
      for (let c = 0; c < clipboard[0].length && selection.c1 + c < cols; c++)
        ng[selection.r1 + r][selection.c1 + c] = clipboard[r][c];
    setGridWithHistory(ng);
  }, [clipboard, selection, grid, rows, cols, setGridWithHistory]);

  const fillSelection = () => {
    if (!selection) return;
    const ng = deepCopy(grid);
    for (let r = selection.r1; r <= selection.r2; r++)
      for (let c = selection.c1; c <= selection.c2; c++) ng[r][c] = activeColor;
    setGridWithHistory(ng);
  };

  const clearGrid = () => {
    setGridWithHistory(makeGrid(rows, cols));
    setSelection(null);
  };

  const copyFromInput = () => {
    if (!inputGrid) return;
    setGridWithHistory(deepCopy(inputGrid));
    setRows(inputGrid.length);
    setCols(inputGrid[0].length);
    setSelection(null);
  };

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          copySelection();
          break;
        case "v":
          e.preventDefault();
          pasteAtSelection();
          break;
        case "z":
          e.preventDefault();
          undo();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [copySelection, pasteAtSelection, undo]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-editor)", borderLeft: "1px solid var(--border-default)" }}>
      {/* ── Toolbar row ── */}
      <div className="p-3 flex flex-wrap items-center gap-2" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <span className="text-xs font-bold tracking-widest mr-2" style={{ color: "var(--text-label)" }}>
          EDITOR
        </span>

        {/* Size controls */}
        <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: "var(--bg-raised)" }}>
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>R:</label>
          <input
            type="number" min={1} max={30} value={rows}
            onChange={(e) => resize(Math.max(1, Math.min(30, +e.target.value)), cols)}
            className="text-xs rounded px-1 py-0.5"
            style={{ width: 40, textAlign: "center", background: "var(--bg-input)", color: "var(--text-heading)", border: "1px solid var(--border-strong)" }}
          />
          <label className="text-xs ml-1" style={{ color: "var(--text-secondary)" }}>C:</label>
          <input
            type="number" min={1} max={30} value={cols}
            onChange={(e) => resize(rows, Math.max(1, Math.min(30, +e.target.value)))}
            className="text-xs rounded px-1 py-0.5"
            style={{ width: 40, textAlign: "center", background: "var(--bg-input)", color: "var(--text-heading)", border: "1px solid var(--border-strong)" }}
          />
        </div>

        {/* Tool buttons */}
        <div className="flex gap-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.tip}
              style={{
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4, fontSize: 14,
                background: tool === t.id ? "#3a3a28" : "transparent",
                color: tool === t.id ? "var(--accent-yellow)" : "var(--text-secondary)",
                border: tool === t.id ? "1px solid #5a5a38" : "1px solid transparent",
              }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Selection actions (shown when a selection exists) */}
        {selection && (
          <div className="flex gap-1">
            <button onClick={copySelection} className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--text-label)", border: "1px solid var(--border-strong)" }}>
              Copy
            </button>
            <button onClick={pasteAtSelection} className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--text-label)", border: "1px solid var(--border-strong)", opacity: clipboard ? 1 : 0.4 }}>
              Paste
            </button>
            <button onClick={fillSelection} className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--text-label)", border: "1px solid var(--border-strong)" }}>
              Fill
            </button>
          </div>
        )}

        {/* Undo */}
        <button onClick={undo} title="Undo (Ctrl+Z)" className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-strong)" }}>
          ↩ Undo
        </button>

        {/* Utility buttons */}
        {inputGrid && (
          <button onClick={copyFromInput} className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--accent-blue)", border: "1px solid var(--btn-blue-border)" }}>
            Copy input
          </button>
        )}
        <button onClick={clearGrid} className="px-2 py-1 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--accent-red)", border: "1px solid var(--btn-red-border)" }}>
          Clear
        </button>

        {/* Shortcut hints */}
        <span className="text-xs ml-1" style={{ color: "var(--text-dimmed)" }}>
          ⌘/Ctrl + C·V·Z
        </span>
      </div>

      {/* ── Color palette ── */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <ColorPalette activeColor={activeColor} setActiveColor={setActiveColor} />
      </div>

      {/* ── Editable canvas ── */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <EditableGrid
          grid={grid}
          setGrid={setGridWithHistory}
          cellSize={24}
          activeColor={activeColor}
          tool={tool}
          selection={selection}
          setSelection={setSelection}
        />
      </div>

      {/* ── Save / Cancel ── */}
      <div className="p-3 flex gap-2 justify-between" style={{ borderTop: "1px solid var(--border-default)" }}>
        <button onClick={onCancel} className="px-4 py-2 text-xs rounded" style={{ background: "var(--bg-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-strong)" }}>
          Cancel
        </button>
        <button onClick={() => onSave(grid)} className="px-4 py-2 text-xs rounded font-bold" style={{ background: "var(--btn-green-bg)", color: "var(--accent-green-strong)", border: "1px solid var(--btn-green-border)" }}>
          Save solution
        </button>
      </div>
    </div>
  );
}
