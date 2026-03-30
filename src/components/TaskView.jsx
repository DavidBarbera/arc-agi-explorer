import { useState } from "react";
import Grid from "./Grid";
import { useApp } from "../context/AppContext";

/**
 * Main content area for the selected task.
 *
 * Changes from v1:
 *   – Solution toggle is per test-pair, placed right on the placeholder/solution
 *   – Edit buttons only appear when viewing the "test" split
 */
export default function TaskView() {
  const {
    selectedTask,
    selectedTaskData: task,
    currentSolutions,
    createdSolutions,
    currentSet,
    setEditingTest,
  } = useApp();

  // Track which test indices have their solution revealed
  const [revealedSet, setRevealedSet] = useState(new Set());

  // Reset reveals when task changes (via key on the wrapper)
  const toggleReveal = (idx) => {
    setRevealedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  /* ── Empty state ── */
  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-dimmed)" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">◇</div>
          <div className="text-sm">Select a task from the sidebar</div>
        </div>
      </div>
    );
  }

  const officialSol = currentSolutions?.[selectedTask];
  const createdSol = createdSolutions[currentSet]?.[selectedTask];

  /** Get the best available solution for a given test index. */
  const getSolution = (ti) => createdSol?.[ti] || officialSol?.[ti] || null;

  const isTestSet = currentSet === "test";

  return (
    <div className="flex-1 overflow-auto p-5" key={selectedTask}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-bold tracking-wide"
            style={{ color: "var(--text-heading)" }}
          >
            {selectedTask}
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: "var(--bg-raised)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {task.train.length} train · {task.test.length} test
          </span>
        </div>

        {/* Edit buttons — only for the test set */}
        {isTestSet && (
          <div className="flex items-center gap-2 flex-wrap">
            {task.test.map((_, ti) => {
              const hasSol = !!createdSol?.[ti];
              return (
                <button
                  key={ti}
                  onClick={() => setEditingTest(ti)}
                  className="px-3 py-1.5 text-xs rounded"
                  style={{
                    background: hasSol ? "#2a3a2a" : "var(--bg-raised)",
                    color: hasSol ? "var(--accent-green-bright)" : "var(--accent-blue)",
                    border: `1px solid ${hasSol ? "#3a5a3a" : "var(--btn-blue-border)"}`,
                  }}
                >
                  {hasSol ? `✓ Test ${ti + 1} solved` : `✎ Edit test ${ti + 1}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Training examples ── */}
      <section className="mb-6">
        <h3
          className="text-xs font-bold tracking-widest mb-3"
          style={{ color: "var(--text-label)" }}
        >
          TRAINING EXAMPLES
        </h3>
        <div className="flex flex-wrap gap-5">
          {task.train.map((pair, i) => (
            <PairRow key={i} input={pair.input} output={pair.output} index={i} />
          ))}
        </div>
      </section>

      {/* ── Test inputs + per-solution toggles ── */}
      <section>
        <h3
          className="text-xs font-bold tracking-widest mb-3"
          style={{ color: "var(--text-label)" }}
        >
          TEST INPUTS
        </h3>
        <div className="flex flex-wrap gap-5">
          {task.test.map((pair, ti) => {
            const sol = getSolution(ti);
            const isRevealed = revealedSet.has(ti);
            return (
              <div
                key={ti}
                className="flex gap-3 items-start p-3 rounded-lg"
                style={{ background: "#18181608", border: "1px solid #22221f" }}
              >
                <Grid grid={pair.input} label={`Test input ${ti + 1}`} />
                <Arrow />

                {/* Solution area — either revealed grid or placeholder with toggle */}
                {sol ? (
                  <SolutionSlot
                    solution={sol}
                    revealed={isRevealed}
                    onToggle={() => toggleReveal(ti)}
                    index={ti}
                  />
                ) : (
                  <EmptyPlaceholder />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function PairRow({ input, output, index }) {
  return (
    <div
      className="flex gap-3 items-start p-3 rounded-lg"
      style={{ background: "#18181608", border: "1px solid #22221f" }}
    >
      <Grid grid={input} label={`Input ${index + 1}`} />
      <Arrow />
      <Grid grid={output} label={`Output ${index + 1}`} />
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex flex-col justify-center self-center px-1">
      <span style={{ color: "var(--text-muted)", fontSize: 18 }}>→</span>
    </div>
  );
}

/**
 * Clickable solution area. Shows either the grid or a "hidden" card
 * with a reveal toggle button directly on it.
 */
function SolutionSlot({ solution, revealed, onToggle, index }) {
  if (revealed) {
    return (
      <div className="flex flex-col items-start">
        <Grid grid={solution} label={`Solution ${index + 1}`} />
        <button
          onClick={onToggle}
          className="mt-1 text-xs px-2 py-0.5 rounded transition-all"
          style={{
            background: "#3a3a18",
            color: "var(--accent-yellow)",
            border: "1px solid #5a5a28",
          }}
        >
          ⦿ Hide
        </button>
      </div>
    );
  }

  // Hidden state — a tinted placeholder card with the toggle
  const rows = solution.length;
  const cols = solution[0].length;
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-col items-center justify-center rounded-lg"
        style={{
          minWidth: 80,
          minHeight: 80,
          background: "var(--bg-input)",
          border: "1px dashed var(--border-default)",
          padding: "12px 16px",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <span className="text-xs mb-1" style={{ color: "var(--text-dimmed)" }}>
          {rows}×{cols}
        </span>
        <button
          className="text-xs px-2 py-0.5 rounded transition-all"
          style={{
            background: "var(--bg-raised)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          ◯ Reveal
        </button>
      </div>
    </div>
  );
}

/** No solution exists at all for this test input. */
function EmptyPlaceholder() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg"
      style={{
        width: 80,
        height: 80,
        background: "var(--bg-input)",
        border: "1px dashed var(--border-default)",
      }}
    >
      <span className="text-xs" style={{ color: "var(--text-dimmed)" }}>?</span>
    </div>
  );
}
