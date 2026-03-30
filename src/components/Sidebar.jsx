import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";

/* ─── Glob → regex converter ───────────────────────────────────────── */

/**
 * Convert a simple glob pattern into a RegExp.
 *   *  → match any characters (including none)
 *   ?  → match exactly one character
 *
 * Plain text (no * or ?) falls back to substring match.
 */
function globToRegex(pattern) {
  const trimmed = pattern.trim().toLowerCase();
  if (!trimmed) return null;

  const hasWild = trimmed.includes("*") || trimmed.includes("?");
  if (!hasWild) return null; // signal to caller: use plain substring

  // Escape regex-special chars except our wildcards
  const escaped = trimmed.replace(/([.+^${}()|[\]\\])/g, "\\$1");
  const converted = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${converted}$`, "i");
}

/* ─── Sort definitions ─────────────────────────────────────────────── */

const SORT_KEYS = [
  { id: "name", label: "Name" },
  { id: "train", label: "Train #" },
  { id: "test", label: "Test #" },
];

/* ─── Dropdown helper ──────────────────────────────────────────────── */

function MiniSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs rounded px-1 py-0.5"
      style={{
        background: "var(--bg-input)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-strong)",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─── Compact number input ─────────────────────────────────────────── */

function MiniNumber({ value, onChange, placeholder, min = 0, max = 99 }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="text-xs rounded px-1 py-0.5"
      style={{
        width: 40,
        textAlign: "center",
        background: "var(--bg-input)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-strong)",
        outline: "none",
      }}
    />
  );
}

/* ─── Main Sidebar ─────────────────────────────────────────────────── */

export default function Sidebar() {
  const {
    currentSet,
    currentChallenges,
    solutionSets,
    createdSolutions,
    selectedTask,
    search,
    setSearch,
    selectTask,
  } = useApp();

  /* ── Local filter/sort state ── */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [trainMin, setTrainMin] = useState("");
  const [trainMax, setTrainMax] = useState("");
  const [testMin, setTestMin] = useState("");
  const [testMax, setTestMax] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const hasActiveFilters =
    trainMin !== "" || trainMax !== "" || testMin !== "" || testMax !== "";

  const clearFilters = () => {
    setTrainMin("");
    setTrainMax("");
    setTestMin("");
    setTestMax("");
  };

  /* ── Compute filtered + sorted task list ── */
  const filteredTasks = useMemo(() => {
    if (!currentChallenges) return [];

    const allIds = Object.keys(currentChallenges);

    // 1. Text / glob filter
    const searchTrimmed = search.trim().toLowerCase();
    const glob = globToRegex(search);

    let ids = allIds;
    if (searchTrimmed) {
      if (glob) {
        ids = ids.filter((id) => glob.test(id));
      } else {
        ids = ids.filter((id) => id.toLowerCase().includes(searchTrimmed));
      }
    }

    // 2. Train count filter
    const tMin = trainMin !== "" ? parseInt(trainMin, 10) : null;
    const tMax = trainMax !== "" ? parseInt(trainMax, 10) : null;
    if (tMin !== null || tMax !== null) {
      ids = ids.filter((id) => {
        const n = currentChallenges[id].train.length;
        if (tMin !== null && n < tMin) return false;
        if (tMax !== null && n > tMax) return false;
        return true;
      });
    }

    // 3. Test count filter
    const eMin = testMin !== "" ? parseInt(testMin, 10) : null;
    const eMax = testMax !== "" ? parseInt(testMax, 10) : null;
    if (eMin !== null || eMax !== null) {
      ids = ids.filter((id) => {
        const n = currentChallenges[id].test.length;
        if (eMin !== null && n < eMin) return false;
        if (eMax !== null && n > eMax) return false;
        return true;
      });
    }

    // 4. Sort
    const dir = sortDir === "asc" ? 1 : -1;
    ids.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.localeCompare(b);
      } else if (sortKey === "train") {
        cmp = currentChallenges[a].train.length - currentChallenges[b].train.length;
      } else if (sortKey === "test") {
        cmp = currentChallenges[a].test.length - currentChallenges[b].test.length;
      }
      // Secondary sort by name for stable ordering
      if (cmp === 0 && sortKey !== "name") cmp = a.localeCompare(b);
      return cmp * dir;
    });

    return ids;
  }, [currentChallenges, search, trainMin, trainMax, testMin, testMax, sortKey, sortDir]);

  const totalTasks = currentChallenges ? Object.keys(currentChallenges).length : 0;
  const isFiltered = filteredTasks.length !== totalTasks;

  return (
    <div
      className="flex flex-col"
      style={{ width: 250, background: "var(--bg-surface)", borderRight: "1px solid var(--border-default)" }}
    >
      {/* ── Search bar ── */}
      <div className="p-2 flex gap-1" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <input
          type="text"
          placeholder="Search (* ? glob)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs rounded px-2 py-1.5"
          style={{
            flex: 1,
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            outline: "none",
          }}
        />
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          title="Filters & sorting"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            fontSize: 12,
            background: filtersOpen || hasActiveFilters ? "#2a2a18" : "var(--bg-raised)",
            color: filtersOpen || hasActiveFilters ? "var(--accent-yellow)" : "var(--text-secondary)",
            border: filtersOpen || hasActiveFilters
              ? "1px solid #5a5a28"
              : "1px solid var(--border-default)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ⚙
        </button>
      </div>

      {/* ── Filter / sort panel (collapsible) ── */}
      {filtersOpen && currentChallenges && (
        <div
          className="px-2 py-2 flex flex-col gap-2"
          style={{ borderBottom: "1px solid var(--border-default)", background: "#13131208" }}
        >
          {/* Sort */}
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)", width: 32 }}>Sort</span>
            <MiniSelect
              value={sortKey}
              onChange={setSortKey}
              options={SORT_KEYS.map((k) => ({ value: k.id, label: k.label }))}
            />
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-strong)",
                cursor: "pointer",
                minWidth: 20,
                textAlign: "center",
              }}
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {/* Train count */}
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)", width: 32 }}>Train</span>
            <MiniNumber value={trainMin} onChange={setTrainMin} placeholder="min" />
            <span className="text-xs" style={{ color: "var(--text-dimmed)" }}>–</span>
            <MiniNumber value={trainMax} onChange={setTrainMax} placeholder="max" />
          </div>

          {/* Test count */}
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)", width: 32 }}>Test</span>
            <MiniNumber value={testMin} onChange={setTestMin} placeholder="min" />
            <span className="text-xs" style={{ color: "var(--text-dimmed)" }}>–</span>
            <MiniNumber value={testMax} onChange={setTestMax} placeholder="max" />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-0.5 rounded self-start"
              style={{
                background: "var(--bg-raised)",
                color: "var(--accent-red)",
                border: "1px solid var(--btn-red-border)",
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!currentChallenges ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-2xl mb-2" style={{ color: "#3a3a28" }}>⬡</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            No {currentSet} set loaded
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-dimmed)" }}>
            Click "Open dataset folder" above
          </div>
        </div>
      ) : (
        /* ── Task list ── */
        <div className="flex-1 overflow-y-auto">
          {filteredTasks.map((id) => {
            const task = currentChallenges[id];
            const hasOfficial = !!solutionSets[currentSet]?.[id];
            const hasCreated = !!createdSolutions[currentSet]?.[id];
            const isSelected = selectedTask === id;

            return (
              <button
                key={id}
                onClick={() => selectTask(id)}
                className="w-full text-left px-3 py-2 flex items-center justify-between transition-all"
                style={{
                  background: isSelected ? "var(--bg-selected)" : "transparent",
                  borderLeft: isSelected
                    ? "2px solid var(--accent-yellow)"
                    : "2px solid transparent",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: isSelected ? "var(--accent-yellow)" : "#a8a890" }}
                  >
                    {id}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {task.train.length}T · {task.test.length}E
                  </div>
                </div>
                <div className="flex gap-1">
                  {hasOfficial && (
                    <div
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "#5a8a3a" }}
                      title="Has official solution"
                    />
                  )}
                  {hasCreated && (
                    <div
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-yellow)" }}
                      title="Has created solution"
                    />
                  )}
                </div>
              </button>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="p-4 text-center">
              <div className="text-xs" style={{ color: "var(--text-dimmed)" }}>
                No tasks match filters
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer count ── */}
      {currentChallenges && (
        <div
          className="px-3 py-2 text-xs"
          style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-dimmed)" }}
        >
          {filteredTasks.length}
          {isFiltered && ` / ${totalTasks}`}
          {" "}tasks
          {isFiltered && (
            <span style={{ color: "var(--accent-yellow)", marginLeft: 4 }}>filtered</span>
          )}
        </div>
      )}
    </div>
  );
}
