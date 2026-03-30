import Grid from "./Grid";
import SolutionEditor from "./SolutionEditor";
import { useApp } from "../context/AppContext";

/**
 * Split-screen layout shown when the user is editing a test solution.
 * Left half: compact view of training pairs + the test input being solved.
 * Right half: the interactive SolutionEditor.
 */
export default function EditorPanel() {
  const {
    selectedTask,
    selectedTaskData: task,
    currentSet,
    currentSolutions,
    createdSolutions,
    editingTest,
    saveSolution,
    setEditingTest,
  } = useApp();

  if (editingTest === null || !task) return null;

  const existingCreated = createdSolutions[currentSet]?.[selectedTask]?.[editingTest];
  const existingOfficial = currentSolutions?.[selectedTask]?.[editingTest];
  const initialGrid = existingCreated || existingOfficial || null;
  const testInput = task.test[editingTest]?.input;

  return (
    <div className="flex-1 flex">
      {/* ── Left: reference ── */}
      <div className="overflow-auto p-4" style={{ flex: "0 0 50%", maxWidth: "50%" }}>
        <h3
          className="text-xs font-bold tracking-widest mb-3"
          style={{ color: "var(--text-label)" }}
        >
          REFERENCE — {selectedTask}
        </h3>

        <div className="flex flex-wrap gap-3 mb-4">
          {task.train.map((pair, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-2 rounded"
              style={{ background: "#18181608", border: "1px solid #22221f" }}
            >
              <Grid grid={pair.input} cellSize={12} label={`In ${i + 1}`} />
              <span className="self-center" style={{ color: "var(--text-muted)" }}>→</span>
              <Grid grid={pair.output} cellSize={12} label={`Out ${i + 1}`} />
            </div>
          ))}
        </div>

        {testInput && (
          <div
            className="p-2 rounded inline-block"
            style={{ background: "#18181608", border: "1px solid #22221f" }}
          >
            <Grid grid={testInput} cellSize={16} label={`Test input ${editingTest + 1}`} />
          </div>
        )}
      </div>

      {/* ── Right: editor ── */}
      <div style={{ flex: 1 }}>
        <SolutionEditor
          initialGrid={initialGrid}
          inputGrid={testInput}
          onSave={(grid) => saveSolution(editingTest, grid)}
          onCancel={() => setEditingTest(null)}
        />
      </div>
    </div>
  );
}
