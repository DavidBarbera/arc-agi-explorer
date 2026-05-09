import { useRef } from "react";
import { ARC_COLORS } from "../constants/colors";
import { SETS, SET_LABELS } from "../constants/sets";
import { useApp } from "../context/AppContext";

/**
 * Top navigation bar:
 *   – ARC-AGI-2 branding
 *   – Train / Eval / Test tab switcher
 *   – "Open dataset folder" (directory picker or webkitdirectory fallback)
 *   – Linked solutions file indicator (auto-discovered) / download fallback
 */
export default function TopBar() {
  const {
    datasets,
    currentSet,
    folderName,
    isLoading,
    linkedFileName,
    testCreatedCount,
    supportsDirectoryPicker,
    switchSet,
    openDirectoryPicker,
    loadFolderFallback,
    downloadTestSolutions,
  } = useApp();

  const folderRef = useRef(null);

  const handleOpenFolder = () => {
    if (supportsDirectoryPicker) {
      openDirectoryPicker();
    } else {
      folderRef.current?.click();
    }
  };

  const handleFallbackSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) loadFolderFallback(files);
    e.target.value = "";
  };

  const hasTestData = !!datasets.test;

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{
        background: "var(--bg-topbar)",
        borderBottom: "1px solid var(--border-default)",
        minHeight: 48,
      }}
    >
      {/* ── Left: brand + tabs ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 6, 8].map((c) => (
              <div key={c} style={{ width: 5, height: 5, borderRadius: 1, background: ARC_COLORS[c] }} />
            ))}
          </div>
          <span className="text-sm font-bold tracking-wider" style={{ color: "var(--text-heading)" }}>
            ARC-AGI-2
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>explorer</span>
        </div>

        {/* Set tabs */}
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          {SETS.map((s, i) => {
            const count = datasets[s] ? Object.keys(datasets[s]).length : 0;
            return (
              <button
                key={s}
                onClick={() => switchSet(s)}
                className="px-3 py-1 text-xs transition-all"
                style={{
                  background: currentSet === s ? "#2a2a18" : "transparent",
                  color: currentSet === s ? "var(--accent-yellow)" : "#6a6a5a",
                  fontWeight: currentSet === s ? 700 : 400,
                  borderRight: i < SETS.length - 1 ? "1px solid var(--border-default)" : "none",
                  opacity: !datasets[s] && currentSet !== s ? 0.4 : 1,
                }}
              >
                {SET_LABELS[s]}
                {count > 0 && ` (${count})`}
              </button>
            );
          })}
        </div>

        {/* Folder indicator */}
        {folderName && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            {folderName === "bundled" ? "📦 bundled data" : `📁 ${folderName}`}
          </span>
        )}
      </div>

      {/* ── Right: folder picker + solutions status ── */}
      <div className="flex items-center gap-2">
        {/* Hidden fallback input for browsers without showDirectoryPicker */}
        {!supportsDirectoryPicker && (
          <input
            ref={folderRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleFallbackSelect}
          />
        )}

        <button
          onClick={handleOpenFolder}
          className="px-3 py-1 text-xs rounded"
          style={{
            background: "var(--bg-raised)",
            color: "var(--accent-blue)",
            border: "1px solid var(--btn-blue-border)",
          }}
        >
          {isLoading ? "Loading…" : "Open dataset folder"}
        </button>

        {/* Solutions file status — shown on test tab when test data is loaded */}
        {hasTestData && currentSet === "test" && (
          <>
            {linkedFileName ? (
              /* Auto-linked — file is being written to on every save */
              <span
                className="text-xs px-2 py-1 rounded flex items-center gap-1.5"
                style={{
                  background: "#1a2a1a",
                  color: "var(--accent-green)",
                  border: "1px solid #3a5a3a",
                }}
              >
                <span style={{ color: "var(--accent-green-bright)" }}>●</span>
                {linkedFileName}
                {testCreatedCount > 0 && (
                  <span style={{ color: "var(--accent-green-strong)" }}>
                    ({testCreatedCount} solved)
                  </span>
                )}
              </span>
            ) : testCreatedCount > 0 ? (
              /* No write handle — offer download as fallback */
              <button
                onClick={downloadTestSolutions}
                className="px-3 py-1 text-xs rounded font-bold"
                style={{
                  background: "var(--btn-green-bg)",
                  color: "var(--accent-green-strong)",
                  border: "1px solid var(--btn-green-border)",
                }}
              >
                Download solutions ({testCreatedCount})
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
