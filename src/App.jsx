import { TopBar, Sidebar, TaskView, EditorPanel, StatusBar } from "./components";
import { useApp } from "./context/AppContext";

/**
 * Root layout:
 *   ┌─────────────── TopBar ───────────────┐
 *   │ Sidebar │   TaskView / EditorPanel    │
 *   └─────────────── StatusBar ────────────┘
 *
 * The EditorPanel only appears for the "test" split when editing.
 */
export default function App() {
  const { editingTest, selectedTaskData, currentSet } = useApp();
  const isEditing = editingTest !== null && selectedTaskData && currentSet === "test";

  return (
    <div className="flex flex-col h-screen w-full">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {isEditing ? <EditorPanel /> : <TaskView />}
      </div>
      <StatusBar />
    </div>
  );
}
