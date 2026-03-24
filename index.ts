import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignee: z.string().optional(),
});

const columnSchema = z.object({
  name: z.string(),
  tasks: z.array(taskSchema),
});

type Column = z.infer<typeof columnSchema>;

const server = new MCPServer({
  name: "kanban-board",
  title: "Kanban Board",
  version: "1.0.0",
  description: "Task management — Trello in your chat",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [
    { src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] },
  ],
});

let boardState: Column[] = [];

server.tool(
  {
    name: "show-board",
    description:
      "Display a kanban board with columns and tasks. " +
      "Each column has a name and an array of tasks with id, title, optional description, priority, and assignee.",
    schema: z.object({
      columns: z.array(columnSchema).describe("Board columns with tasks"),
    }),
    widget: {
      name: "kanban-board",
      invoking: "Loading board...",
      invoked: "Board ready",
    },
  },
  async ({ columns }) => {
    boardState = columns;

    const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
    return widget({
      props: { columns },
      output: text(
        `Board with ${columns.length} columns and ${totalTasks} total tasks`
      ),
    });
  }
);

server.tool(
  {
    name: "add-task",
    description:
      "Add a new task to a column on the board. Returns the updated board.",
    schema: z.object({
      column: z.string().describe("Column name to add the task to"),
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe("Task priority"),
      assignee: z.string().optional().describe("Person assigned to the task"),
    }),
    widget: {
      name: "kanban-board",
      invoking: "Adding task...",
      invoked: "Task added",
    },
  },
  async ({ column, title, description, priority, assignee }) => {
    const col = boardState.find(
      (c) => c.name.toLowerCase() === column.toLowerCase()
    );

    if (!col) {
      boardState.push({
        name: column,
        tasks: [
          {
            id: `task-${Date.now()}`,
            title,
            description,
            priority,
            assignee,
          },
        ],
      });
    } else {
      col.tasks.push({
        id: `task-${Date.now()}`,
        title,
        description,
        priority,
        assignee,
      });
    }

    return widget({
      props: { columns: boardState },
      output: text(`Added "${title}" to "${column}"`),
    });
  }
);

server.tool(
  {
    name: "move-task",
    description:
      "Move a task from its current column to a different column. Returns the updated board.",
    schema: z.object({
      taskId: z.string().describe("ID of the task to move"),
      toColumn: z.string().describe("Destination column name"),
    }),
    widget: {
      name: "kanban-board",
      invoking: "Moving task...",
      invoked: "Task moved",
    },
  },
  async ({ taskId, toColumn }) => {
    let movedTask = null;

    for (const col of boardState) {
      const idx = col.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        movedTask = col.tasks.splice(idx, 1)[0];
        break;
      }
    }

    if (movedTask) {
      let destCol = boardState.find(
        (c) => c.name.toLowerCase() === toColumn.toLowerCase()
      );
      if (!destCol) {
        destCol = { name: toColumn, tasks: [] };
        boardState.push(destCol);
      }
      destCol.tasks.push(movedTask);
    }

    return widget({
      props: { columns: boardState },
      output: text(
        movedTask
          ? `Moved "${movedTask.title}" to "${toColumn}"`
          : `Task ${taskId} not found`
      ),
    });
  }
);

server.tool(
  {
    name: "summarize-board",
    description:
      "Get a text summary of the current board state — columns, task counts, and priorities.",
    schema: z.object({}),
  },
  async () => {
    if (boardState.length === 0) {
      return text("The board is empty. Use show-board to create one.");
    }

    const totalTasks = boardState.reduce(
      (sum, col) => sum + col.tasks.length,
      0
    );
    const lines = [
      `Board summary: ${boardState.length} columns, ${totalTasks} tasks`,
      "",
    ];

    for (const col of boardState) {
      const highCount = col.tasks.filter((t) => t.priority === "high").length;
      const medCount = col.tasks.filter((t) => t.priority === "medium").length;
      const lowCount = col.tasks.filter((t) => t.priority === "low").length;

      lines.push(
        `${col.name} (${col.tasks.length} tasks) — high: ${highCount}, medium: ${medCount}, low: ${lowCount}`
      );
      for (const task of col.tasks) {
        lines.push(
          `  • [${task.priority}] ${task.title}${task.assignee ? ` (${task.assignee})` : ""}`
        );
      }
    }

    return text(lines.join("\n"));
  }
);

server.listen().then(() => console.log("Kanban Board running"));
