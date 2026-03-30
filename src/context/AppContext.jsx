import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SETS } from "../constants/sets";
import { deepCopy } from "../utils/grid";
import { loadCreatedSolutions, saveCreatedSolutions } from "../utils/storage";
import {
  loadDatasetFromDirectoryPicker,
  loadDatasetFromFolder,
  writeSolutionsFile,
  buildSolutionsObject,
  downloadSolutions,
  importTestSolutions,
  hasDirectoryPicker,
} from "../utils/fileIO";

const AppContext = createContext(null);

const emptySetMap = () => Object.fromEntries(SETS.map((s) => [s, null]));
const emptyCreated = () => Object.fromEntries(SETS.map((s) => [s, {}]));

export function AppProvider({ children }) {
  /* ── Dataset state ── */
  const [datasets, setDatasets] = useState(emptySetMap);
  const [solutionSets, setSolutionSets] = useState(emptySetMap);
  const [createdSolutions, setCreatedSolutions] = useState(emptyCreated);
  const [folderName, setFolderName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ── Persistent test solutions file ── */
  const testFileHandleRef = useRef(null);
  const [linkedFileName, setLinkedFileName] = useState(null);
  const supportsDirectoryPicker = hasDirectoryPicker();

  /* ── Navigation state ── */
  const [currentSet, setCurrentSet] = useState("evaluation");
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [search, setSearch] = useState("");

  /* ── Persist to localStorage ── */
  useEffect(() => {
    const saved = loadCreatedSolutions();
    if (saved) setCreatedSolutions(saved);
  }, []);

  useEffect(() => {
    saveCreatedSolutions(createdSolutions);
  }, [createdSolutions]);

  /* ── Derived ── */
  const currentChallenges = datasets[currentSet];
  const currentSolutions = solutionSets[currentSet];

  const taskIds = useMemo(() => {
    if (!currentChallenges) return [];
    return Object.keys(currentChallenges)
      .sort()
      .filter((id) => !search || id.toLowerCase().includes(search.toLowerCase()));
  }, [currentChallenges, search]);

  const selectedTaskData =
    currentChallenges && selectedTask ? currentChallenges[selectedTask] : null;

  const testCreatedCount = Object.keys(createdSolutions.test || {}).length;

  /* ── Write to linked file ── */
  const writeToLinkedFile = useCallback(
    (nextCreated, nextDatasets) => {
      const ds = nextDatasets || datasets;
      if (!testFileHandleRef.current || !ds.test) return;
      const fullObj = buildSolutionsObject(nextCreated.test || {}, ds.test);
      writeSolutionsFile(testFileHandleRef.current, fullObj);
    },
    [datasets]
  );

  /* ── Actions ── */

  /**
   * Shared logic: after loading, merge test solutions into createdSolutions
   * and set up the auto-write handle.
   */
  const applyLoadResult = (dirName, ds, sol, testSolExisting, testSolFileHandle) => {
    setFolderName(dirName);
    setDatasets(ds);
    setSolutionSets(sol);

    // Auto-link the test solutions file
    if (testSolFileHandle) {
      testFileHandleRef.current = testSolFileHandle;
      setLinkedFileName(testSolFileHandle.name);
    } else {
      testFileHandleRef.current = null;
      setLinkedFileName(null);
    }

    // Import existing test solutions into createdSolutions
    setCreatedSolutions((prev) => {
      const next = deepCopy(prev);
      if (testSolExisting) {
        const imported = importTestSolutions(testSolExisting);
        // Merge: keep any localStorage entries that aren't in the file,
        // but prefer file content for entries that exist in both.
        next.test = { ...(next.test || {}), ...imported };
      }
      return next;
    });

    // Auto-select tab
    if (ds.evaluation) setCurrentSet("evaluation");
    else if (ds.train) setCurrentSet("train");
    else if (ds.test) setCurrentSet("test");

    setSelectedTask(null);
    setEditingTest(null);
  };

  /**
   * Primary path (Chrome/Edge): showDirectoryPicker gives read+write handles.
   * The test solutions file is auto-discovered or created in the root.
   */
  const openDirectoryPicker = async () => {
    setIsLoading(true);
    try {
      const result = await loadDatasetFromDirectoryPicker();
      applyLoadResult(
        result.dirName,
        result.datasets,
        result.solutions,
        result.testSolExisting,
        result.testSolFileHandle
      );
    } catch (err) {
      if (err.name !== "AbortError") console.error("Failed to load directory:", err);
    }
    setIsLoading(false);
  };

  /**
   * Fallback (Firefox/Safari): webkitdirectory gives read-only File objects.
   * Test solutions are imported but auto-write is not possible.
   */
  const loadFolderFallback = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsLoading(true);
    try {
      const firstPath = fileList[0].webkitRelativePath;
      const root = firstPath.split("/")[0];

      const { datasets: ds, solutions: sol, testSolExisting } =
        await loadDatasetFromFolder(fileList);

      applyLoadResult(root, ds, sol, testSolExisting, null);
    } catch (err) {
      console.error("Failed to load folder:", err);
    }
    setIsLoading(false);
  };

  const switchSet = (set) => {
    setCurrentSet(set);
    setSelectedTask(null);
    setEditingTest(null);
  };

  const selectTask = (id) => {
    setSelectedTask(id);
    setEditingTest(null);
  };

  const saveSolution = (testIdx, grid) => {
    setCreatedSolutions((prev) => {
      const next = deepCopy(prev);
      if (!next[currentSet]) next[currentSet] = {};
      if (!next[currentSet][selectedTask]) next[currentSet][selectedTask] = {};
      next[currentSet][selectedTask][testIdx] = grid;

      if (currentSet === "test") writeToLinkedFile(next);
      return next;
    });
    setEditingTest(null);
  };

  const downloadTestSolutions = () => {
    if (!datasets.test) return;
    downloadSolutions(createdSolutions.test || {}, datasets.test, "test");
  };

  const value = {
    datasets, solutionSets, createdSolutions,
    currentSet, selectedTask, editingTest, search,
    folderName, isLoading, linkedFileName, testCreatedCount,
    supportsDirectoryPicker,

    currentChallenges, currentSolutions, taskIds, selectedTaskData,

    openDirectoryPicker,
    loadFolderFallback,
    switchSet, selectTask, saveSolution,
    setEditingTest, setSearch,
    downloadTestSolutions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
