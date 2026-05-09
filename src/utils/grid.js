import { ARC_COLORS } from "../constants/colors";

/**
 * Deep-clone any JSON-serializable value.
 */
export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a new rows×cols grid filled with `value` (default 0).
 */
export function makeGrid(rows, cols, value = 0) {
  return Array.from({ length: rows }, () => Array(cols).fill(value));
}

/**
 * Compute a dynamic cell size in pixels so the grid fits
 * within `maxExtent` px on its longest axis.
 */
export function dynamicCellSize(rows, cols, baseSize = 18, maxExtent = 360) {
  return Math.min(baseSize, Math.floor(maxExtent / Math.max(rows, cols)));
}

/**
 * Flood-fill a contiguous region of same-colored cells starting at (r, c).
 * Mutates `grid` in-place — caller should pass a deepCopy.
 * Uses iterative BFS to avoid stack overflow on large grids.
 */
export function floodFill(grid, r, c, newColor) {
  const rows = grid.length;
  const cols = grid[0].length;
  const oldColor = grid[r][c];
  if (oldColor === newColor) return;

  const queue = [[r, c]];
  grid[r][c] = newColor;

  while (queue.length > 0) {
    const [cr, cc] = queue.pop();
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === oldColor) {
        grid[nr][nc] = newColor;
        queue.push([nr, nc]);
      }
    }
  }
}

/* ─── Grid → clipboard as PNG ──────────────────────────────────────── */

/**
 * Render a 2-D grid (or sub-region) to an offscreen canvas and copy
 * the result to the clipboard as a PNG image.
 *
 * @param {number[][]} grid      – full grid or extracted sub-grid
 * @param {number}     cellPx    – pixel size per cell in the exported image
 * @param {number}     gapPx     – gap between cells
 * @returns {Promise<boolean>}   – true if copy succeeded
 */
export async function gridToClipboard(grid, cellPx = 20, gapPx = 1) {
  const rows = grid.length;
  const cols = grid[0].length;
  const w = cols * (cellPx + gapPx) + gapPx;
  const h = rows * (cellPx + gapPx) + gapPx;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1a1a18";
  ctx.fillRect(0, 0, w, h);

  // Cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = ARC_COLORS[grid[r][c]] ?? ARC_COLORS[0];
      const x = gapPx + c * (cellPx + gapPx);
      const y = gapPx + r * (cellPx + gapPx);
      ctx.fillRect(x, y, cellPx, cellPx);
    }
  }

  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch (err) {
    console.error("Failed to copy grid to clipboard:", err);
    return false;
  }
}

/**
 * Extract a sub-region from a grid.
 *
 * @param {number[][]} grid
 * @param {{ r1: number, r2: number, c1: number, c2: number }} rect
 * @returns {number[][]}
 */
export function extractSubGrid(grid, rect) {
  const sub = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    const row = [];
    for (let c = rect.c1; c <= rect.c2; c++) {
      row.push(grid[r][c]);
    }
    sub.push(row);
  }
  return sub;
}

/* ─── Grid → Excalidraw native clipboard ───────────────────────────── */

/** Generate a random alphanumeric ID for Excalidraw elements. */
function excalidrawId() {
  return Array.from({ length: 20 }, () =>
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
      Math.floor(Math.random() * 62)
    ]
  ).join("");
}

/**
 * Convert a 2-D grid into an array of Excalidraw rectangle elements.
 * Each cell is an independent rectangle; all cells share a groupId
 * so the grid moves as one unit but can be ungrouped.
 *
 * @param {number[][]} grid    – 2-D array of ARC color indices
 * @param {number}     cellPx  – cell size in Excalidraw canvas units
 * @param {number}     gapPx   – gap between cells
 * @returns {object[]}         – Excalidraw element array
 */
export function gridToExcalidrawElements(grid, cellPx = 30, gapPx = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  const groupId = excalidrawId();
  const now = Date.now();
  const elements = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      elements.push({
        id: excalidrawId(),
        type: "rectangle",
        x: c * (cellPx + gapPx),
        y: r * (cellPx + gapPx),
        width: cellPx,
        height: cellPx,
        angle: 0,
        strokeColor: "transparent",
        backgroundColor: ARC_COLORS[grid[r][c]] ?? ARC_COLORS[0],
        fillStyle: "solid",
        strokeWidth: 0,
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        index: `a${r * cols + c}`,
        roundness: null,
        seed: Math.floor(Math.random() * 2e9),
        version: 1,
        versionNonce: Math.floor(Math.random() * 2e9),
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
      });
    }
  }

  return elements;
}

/**
 * Copy a grid to the clipboard as native Excalidraw elements.
 * When pasted into Excalidraw, each cell becomes an independent
 * rectangle that can be selected, moved, recolored, or copied.
 *
 * @param {number[][]} grid
 * @param {number}     cellPx
 * @returns {Promise<boolean>}
 */
export async function gridToExcalidrawClipboard(grid, cellPx = 30, gapPx = 2) {
  const elements = gridToExcalidrawElements(grid, cellPx, gapPx);
  const clipboardData = JSON.stringify({
    type: "excalidraw/clipboard",
    elements,
    files: {},
  });

  try {
    await navigator.clipboard.writeText(clipboardData);
    return true;
  } catch (err) {
    console.error("Failed to copy Excalidraw data:", err);
    return false;
  }
}
