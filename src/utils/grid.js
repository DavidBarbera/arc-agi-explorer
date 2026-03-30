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
