import { SETS } from "../constants/sets";
import { useApp } from "../context/AppContext";

/**
 * Thin status bar at the bottom showing folder and dataset status.
 */
export default function StatusBar() {
  const { datasets, solutionSets, folderName } = useApp();

  return (
    <div
      className="flex items-center justify-between px-4 py-1"
      style={{
        background: "var(--bg-statusbar)",
        borderTop: "1px solid var(--border-default)",
        fontSize: 10,
      }}
    >
      <span style={{ color: "var(--text-dimmed)" }}>
        ARC Prize 2026 · ARC-AGI-2 Dataset Explorer
        {folderName && <span style={{ color: "var(--text-secondary)" }}> — {folderName}</span>}
      </span>
      <div className="flex gap-4">
        {SETS.map((s) => {
          const taskCount = datasets[s] ? Object.keys(datasets[s]).length : 0;
          const hasSolutions = !!solutionSets[s];
          return (
            <span key={s} style={{ color: taskCount > 0 ? "#5a8a3a" : "#3a3a28" }}>
              {s}: {taskCount > 0 ? `${taskCount} tasks` : "—"}
              {taskCount > 0 && hasSolutions && " +sol"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
