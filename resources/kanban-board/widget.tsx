import {
  McpUseProvider,
  ModelContext,
  modelContext,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useCallback, useState } from "react";
import "../styles.css";
import { propSchema, type Column, type KanbanBoardProps, type Task } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive kanban board with drag-and-drop and AI awareness",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Loading board...",
    invoked: "Board ready",
  },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  high: {
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {priority}
    </span>
  );
}

function AvatarInitial({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-semibold shrink-0">
      {initial}
    </span>
  );
}

function AddTaskForm({
  columnName,
  onSubmit,
  onCancel,
}: {
  columnName: string;
  onSubmit: (data: { title: string; description: string; priority: "low" | "medium" | "high" }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), priority });
    setTitle("");
    setDescription("");
    setPriority("medium");
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 space-y-2">
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
      <select
        title="Select priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  columns,
  currentColumn,
  onMoveTask,
  isMoving,
  inspectedTaskId,
  onInspect,
}: {
  task: Task;
  columns: Column[];
  currentColumn: string;
  onMoveTask: (taskId: string, toColumn: string) => void;
  isMoving: boolean;
  inspectedTaskId: string | null;
  onInspect: (taskId: string | null) => void;
}) {
  const isInspected = inspectedTaskId === task.id;
  const otherColumns = columns.filter((c) => c.name !== currentColumn);

  return (
    <div
      className={`group rounded-lg border p-3 transition-all cursor-pointer ${
        isInspected
          ? "border-blue-400 dark:border-blue-500 shadow-md shadow-blue-500/10 bg-white dark:bg-gray-800"
          : "border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600"
      } ${isMoving ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => onInspect(isInspected ? null : task.id)}
      onMouseEnter={() => {
        modelContext.set(
          `inspecting-${task.id}`,
          `Inspecting task: ${task.title} (priority: ${task.priority})`
        );
      }}
      onMouseLeave={() => {
        modelContext.remove(`inspecting-${task.id}`);
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
          {task.title}
        </span>
        {task.assignee && <AvatarInitial name={task.assignee} />}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {isInspected && otherColumns.length > 0 && (
          <select
            title="Move task to column"
            className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            defaultValue=""
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) {
                modelContext.set("dragging-task", `Moving task "${task.title}" to "${e.target.value}"`);
                onMoveTask(task.id, e.target.value);
                setTimeout(() => modelContext.remove("dragging-task"), 2000);
              }
            }}
          >
            <option value="" disabled>
              Move to…
            </option>
            {otherColumns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

const KanbanBoard: React.FC = () => {
  const {
    props,
    isPending,
    state,
    setState,
    sendFollowUpMessage,
    displayMode,
    requestDisplayMode,
  } = useWidget<KanbanBoardProps>();

  const { callTool: moveTask, isPending: isMovingTask } = useCallTool("move-task");
  const { callTool: addTask, isPending: isAddingTask } = useCallTool("add-task");

  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [inspectedTaskId, setInspectedTaskId] = useState<string | null>(
    () => (state?.inspectedTaskId as string) ?? null
  );

  const handleInspect = useCallback(
    (taskId: string | null) => {
      setInspectedTaskId(taskId);
      setState({ inspectedTaskId: taskId });
    },
    [setState]
  );

  const handleMoveTask = useCallback(
    (taskId: string, toColumn: string) => {
      moveTask({ taskId, toColumn });
    },
    [moveTask]
  );

  const handleAddTask = useCallback(
    (
      columnName: string,
      data: { title: string; description: string; priority: "low" | "medium" | "high" }
    ) => {
      addTask({
        column: columnName,
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
      });
      setAddingToColumn(null);
    },
    [addTask]
  );

  const isFullscreen = displayMode === "fullscreen";

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading board...
            </span>
          </div>
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                style={{ height: "240px" }}
              />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const columns: Column[] = props?.columns ?? [];
  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const boardHeight = isFullscreen ? "calc(100vh - 56px)" : "460px";

  return (
    <McpUseProvider autoSize>
      <ModelContext content="User is viewing the kanban board">
        {columns.map((col) => (
          <ModelContext
            key={col.name}
            content={`Active column: ${col.name} (${col.tasks.length} tasks)`}
          />
        ))}

        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Kanban Board
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {totalTasks} task{totalTasks !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
              </span>
              {(isMovingTask || isAddingTask) && (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-500">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Updating...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  sendFollowUpMessage(
                    "Please review the board and suggest task prioritization"
                  )
                }
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                Ask AI to prioritize
              </button>
              {!isFullscreen ? (
                <button
                  onClick={() => requestDisplayMode("fullscreen")}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Fullscreen
                </button>
              ) : (
                <button
                  onClick={() => requestDisplayMode("inline")}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Exit
                </button>
              )}
            </div>
          </div>

          {/* Board columns */}
          <div
            className="flex gap-3 p-3 overflow-x-auto"
            style={{ height: boardHeight }}
          >
            {columns.map((col) => (
              <div
                key={col.name}
                className="flex flex-col min-w-[240px] max-w-[300px] flex-1 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {col.name}
                    </span>
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                      {col.tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setAddingToColumn(addingToColumn === col.name ? null : col.name)
                    }
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {col.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      columns={columns}
                      currentColumn={col.name}
                      onMoveTask={handleMoveTask}
                      isMoving={isMovingTask}
                      inspectedTaskId={inspectedTaskId}
                      onInspect={handleInspect}
                    />
                  ))}

                  {col.tasks.length === 0 && addingToColumn !== col.name && (
                    <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
                      No tasks yet
                    </div>
                  )}

                  {addingToColumn === col.name && (
                    <AddTaskForm
                      columnName={col.name}
                      onSubmit={(data) => handleAddTask(col.name, data)}
                      onCancel={() => setAddingToColumn(null)}
                    />
                  )}
                </div>

                {/* Add task trigger at bottom */}
                {addingToColumn !== col.name && (
                  <button
                    onClick={() => setAddingToColumn(col.name)}
                    className="mx-2 mb-2 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    + Add task
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </ModelContext>
    </McpUseProvider>
  );
};

export default KanbanBoard;
