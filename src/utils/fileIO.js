import { makeGrid } from "./grid";

/* ─── Basic helpers ────────────────────────────────────────────────── */

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { resolve(JSON.parse(e.target.result)); }
      catch (err) { reject(new Error("Invalid JSON file")); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

async function readFileHandle(handle) {
  const file = await handle.getFile();
  const text = await file.text();
  return text.trim().length > 2 ? JSON.parse(text) : null;
}

export function hasDirectoryPicker() {
  return typeof window.showDirectoryPicker === "function";
}

/* ─── Set detection ────────────────────────────────────────────────── */

const SET_ALIASES = {
  training: "train", train: "train",
  evaluation: "evaluation", eval: "evaluation",
  test: "test",
};

function detectSetFromName(nameLower) {
  for (const [frag, setName] of Object.entries(SET_ALIASES)) {
    if (nameLower.includes(frag)) return setName;
  }
  return null;
}

function findSetFolder(pathParts) {
  for (let i = pathParts.length - 2; i >= 0; i--) {
    const lower = pathParts[i].toLowerCase();
    if (SET_ALIASES[lower]) return SET_ALIASES[lower];
  }
  return null;
}

function mergeInto(target, source) {
  return target ? { ...target, ...source } : source;
}

function extractEmbeddedSolutions(task) {
  const outputs = task.test.map((t) => t.output).filter(Boolean);
  return outputs.length === task.test.length ? outputs : null;
}

const TEST_SOL_FILENAME = "arc-agi_test_solutions.json";

/* ─── Primary: showDirectoryPicker (read + write) ──────────────────── */

/**
 * Recursively collect all file entries from a directory handle.
 * Returns flat array of { handle: FileSystemFileHandle, path: string[] }.
 */
async function collectFiles(dirHandle, pathPrefix = []) {
  const entries = [];
  for await (const [name, handle] of dirHandle) {
    const path = [...pathPrefix, name];
    if (handle.kind === "file") {
      entries.push({ handle, path, name });
    } else if (handle.kind === "directory") {
      const sub = await collectFiles(handle, path);
      entries.push(...sub);
    }
  }
  return entries;
}

/**
 * Open a directory via the File System Access API.
 * Returns the full dataset + a writable handle for the test solutions file.
 *
 * Result: {
 *   dirName,
 *   datasets:   { train, evaluation, test },
 *   solutions:  { train, evaluation, test },
 *   testSolFileHandle:  FileSystemFileHandle | null,
 *   testSolExisting:    object | null,
 * }
 */
export async function loadDatasetFromDirectoryPicker() {
  const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  const dirName = dirHandle.name;

  const datasets = { train: null, evaluation: null, test: null };
  const solutions = { train: null, evaluation: null, test: null };
  let testSolFileHandle = null;
  let testSolExisting = null;

  const entries = await collectFiles(dirHandle);

  // Consolidated files  +  per-task individual files
  const consolidatedChallenges = [];
  const consolidatedSolutions = [];
  const individualTasks = {};

  for (const entry of entries) {
    if (!entry.name.endsWith(".json")) continue;
    const nameLower = entry.name.toLowerCase();

    // ── Remember the test solutions file handle for writing ──
    if (nameLower === TEST_SOL_FILENAME) {
      testSolFileHandle = entry.handle;
    }

    // ── Strategy A: Consolidated Kaggle-style files ──
    if (nameLower.includes("challenges") || nameLower.includes("solutions")) {
      const setName = detectSetFromName(nameLower);
      if (setName) {
        if (nameLower.includes("challenges")) consolidatedChallenges.push({ setName, entry });
        else consolidatedSolutions.push({ setName, entry });
        continue;
      }
    }

    // ── Strategy B: Individual per-task files ──
    const parentDir = findSetFolder(entry.path);
    if (parentDir) {
      if (!individualTasks[parentDir]) individualTasks[parentDir] = [];
      individualTasks[parentDir].push(entry);
    }
  }

  // Read consolidated
  for (const { setName, entry } of consolidatedChallenges) {
    try {
      const data = await readFileHandle(entry.handle);
      if (data) datasets[setName] = mergeInto(datasets[setName], data);
    } catch { /* skip */ }
  }
  for (const { setName, entry } of consolidatedSolutions) {
    try {
      const data = await readFileHandle(entry.handle);
      if (data) {
        // Test solutions go into testSolExisting for import into createdSolutions
        if (setName === "test") {
          testSolExisting = data;
          // Also keep the handle if we didn't already find one by exact name
          if (!testSolFileHandle) testSolFileHandle = entry.handle;
        } else {
          solutions[setName] = mergeInto(solutions[setName], data);
        }
      }
    } catch { /* skip */ }
  }

  // Read individual tasks
  for (const [setName, entries] of Object.entries(individualTasks)) {
    for (const entry of entries) {
      try {
        const task = await readFileHandle(entry.handle);
        if (task?.train && task?.test) {
          const taskId = entry.name.replace(/\.json$/i, "");
          if (!datasets[setName]) datasets[setName] = {};
          datasets[setName][taskId] = task;
          const taskSols = extractEmbeddedSolutions(task);
          if (taskSols) {
            if (!solutions[setName]) solutions[setName] = {};
            solutions[setName][taskId] = taskSols;
          }
        }
      } catch { /* skip */ }
    }
  }

  // If no test solutions file was found, create one in the directory root
  if (!testSolFileHandle && datasets.test) {
    try {
      testSolFileHandle = await dirHandle.getFileHandle(TEST_SOL_FILENAME, { create: true });
    } catch { /* couldn't create — we'll survive without auto-save */ }
  }

  // If we have a handle but didn't read content yet (found by exact name, not by consolidated scan)
  if (testSolFileHandle && !testSolExisting) {
    try {
      testSolExisting = await readFileHandle(testSolFileHandle);
    } catch { /* empty file */ }
  }

  return { dirName, datasets, solutions, testSolFileHandle, testSolExisting };
}

/* ─── Fallback: <input webkitdirectory> (read only) ────────────────── */

export async function loadDatasetFromFolder(fileList) {
  const datasets = { train: null, evaluation: null, test: null };
  const solutions = { train: null, evaluation: null, test: null };
  let testSolExisting = null;

  const consolidatedChallenges = [];
  const consolidatedSolutions = [];
  const individualTasks = {};

  for (const file of fileList) {
    if (!file.name.endsWith(".json")) continue;
    const pathParts = file.webkitRelativePath.split("/");
    const nameLower = file.name.toLowerCase();

    if (nameLower.includes("challenges") || nameLower.includes("solutions")) {
      const setName = detectSetFromName(nameLower);
      if (setName) {
        if (nameLower.includes("challenges")) consolidatedChallenges.push({ setName, file });
        else consolidatedSolutions.push({ setName, file });
        continue;
      }
    }

    const parentDir = findSetFolder(pathParts);
    if (parentDir) {
      if (!individualTasks[parentDir]) individualTasks[parentDir] = [];
      individualTasks[parentDir].push(file);
    }
  }

  for (const { setName, file } of consolidatedChallenges) {
    try {
      const data = await readJsonFile(file);
      datasets[setName] = mergeInto(datasets[setName], data);
    } catch { /* skip */ }
  }
  for (const { setName, file } of consolidatedSolutions) {
    try {
      const data = await readJsonFile(file);
      if (setName === "test") {
        testSolExisting = data;
      } else {
        solutions[setName] = mergeInto(solutions[setName], data);
      }
    } catch { /* skip */ }
  }

  for (const [setName, files] of Object.entries(individualTasks)) {
    for (const file of files) {
      try {
        const task = await readJsonFile(file);
        if (task?.train && task?.test) {
          const taskId = file.name.replace(/\.json$/i, "");
          if (!datasets[setName]) datasets[setName] = {};
          datasets[setName][taskId] = task;
          const taskSols = extractEmbeddedSolutions(task);
          if (taskSols) {
            if (!solutions[setName]) solutions[setName] = {};
            solutions[setName][taskId] = taskSols;
          }
        }
      } catch { /* skip */ }
    }
  }

  return { datasets, solutions, testSolExisting };
}

/* ─── Write to a FileSystemFileHandle ──────────────────────────────── */

export async function writeSolutionsFile(handle, solutionsObj) {
  if (!handle) return;
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(solutionsObj, null, 2));
    await writable.close();
  } catch (err) {
    console.error("Failed to write solutions file:", err);
  }
}

export function buildSolutionsObject(createdForTest, challenges) {
  if (!challenges) return {};
  const output = {};
  for (const taskId of Object.keys(challenges)) {
    const task = challenges[taskId];
    const created = createdForTest?.[taskId];
    const arr = [];
    for (let i = 0; i < task.test.length; i++) {
      arr.push(created?.[i] || makeGrid(1, 1));
    }
    output[taskId] = arr;
  }
  return output;
}

/* ─── Download fallback ────────────────────────────────────────────── */

export function downloadSolutions(createdForSet, challenges, setName) {
  const output = buildSolutionsObject(createdForSet, challenges);
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arc-agi_${setName}_solutions.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Import test solutions into createdSolutions shape ────────────── */

/**
 * Convert a flat solutions object { taskId: [grid, …] }
 * into the createdSolutions.test shape: { taskId: { 0: grid, 1: grid } }
 * skipping 1×1 placeholder grids.
 */
export function importTestSolutions(solObj) {
  if (!solObj || typeof solObj !== "object") return {};
  const result = {};
  for (const [taskId, solArray] of Object.entries(solObj)) {
    if (!Array.isArray(solArray)) continue;
    solArray.forEach((grid, i) => {
      if (Array.isArray(grid) && (grid.length > 1 || (grid[0] && grid[0].length > 1))) {
        if (!result[taskId]) result[taskId] = {};
        result[taskId][i] = grid;
      }
    });
  }
  return result;
}

/* ─── Load bundled dataset from public/data/ ───────────────────────── */

const DATA_BASE = import.meta.env.BASE_URL + "data/";

/**
 * Silently fetch a JSON file from the bundled data folder.
 * Returns the parsed object or null if not found / error.
 */
async function fetchJson(filename) {
  try {
    const res = await fetch(DATA_BASE + filename);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Known bundled dataset files (Kaggle consolidated format).
 * The app tries to fetch each on startup; missing files are silently skipped.
 */
const BUNDLED_FILES = [
  { set: "train",      kind: "challenges", file: "arc-agi_training_challenges.json" },
  { set: "train",      kind: "solutions",  file: "arc-agi_training_solutions.json" },
  { set: "evaluation", kind: "challenges", file: "arc-agi_evaluation_challenges.json" },
  { set: "evaluation", kind: "solutions",  file: "arc-agi_evaluation_solutions.json" },
  { set: "test",       kind: "challenges", file: "arc-agi_test_challenges.json" },
  { set: "test",       kind: "solutions",  file: "arc-agi_test_solutions.json" },
];

/**
 * Load all available bundled dataset files from public/data/.
 * Returns { datasets, solutions, testSolExisting } — same shape
 * as the folder loaders, ready for applyLoadResult().
 */
export async function loadBundledData() {
  const datasets = { train: null, evaluation: null, test: null };
  const solutions = { train: null, evaluation: null, test: null };
  let testSolExisting = null;

  const results = await Promise.all(
    BUNDLED_FILES.map(async ({ set, kind, file }) => {
      const data = await fetchJson(file);
      return { set, kind, data };
    })
  );

  for (const { set, kind, data } of results) {
    if (!data) continue;
    if (kind === "challenges") {
      datasets[set] = data;
    } else if (kind === "solutions") {
      if (set === "test") {
        testSolExisting = data;
      } else {
        solutions[set] = data;
      }
    }
  }

  const anyLoaded = Object.values(datasets).some(Boolean);
  return { datasets, solutions, testSolExisting, anyLoaded };
}
