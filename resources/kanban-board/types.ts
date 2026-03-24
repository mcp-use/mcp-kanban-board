import { z } from "zod";

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignee: z.string().optional(),
});

export const columnSchema = z.object({
  name: z.string(),
  tasks: z.array(taskSchema),
});

export const propSchema = z.object({
  columns: z.array(columnSchema).describe("Board columns with tasks"),
});

export type Task = z.infer<typeof taskSchema>;
export type Column = z.infer<typeof columnSchema>;
export type KanbanBoardProps = z.infer<typeof propSchema>;
