import type { Task, TaskStatus } from '../../domain/task';
import type { TaskId, ProjectId, PlanItemId } from '../../domain/ids';
import type { EntityState } from '../entities/state';

export interface TaskInput {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  linkedPlanItemId?: PlanItemId;
  status: TaskStatus;
  trigger?: Task['trigger'];
}

export type CommandResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function createTask(input: TaskInput): CommandResult<Task> {
  if (!input.id || typeof input.id !== 'string') {
    return { ok: false, error: 'Task id is required' };
  }
  if (!input.projectId || typeof input.projectId !== 'string') {
    return { ok: false, error: 'Task projectId is required' };
  }
  if (!input.title || typeof input.title !== 'string') {
    return { ok: false, error: 'Task title is required' };
  }
  const validStatuses: TaskStatus[] = ['todo', 'done', 'skipped'];
  if (!validStatuses.includes(input.status)) {
    return { ok: false, error: `Invalid Task status: ${input.status}` };
  }

  const task: Task = {
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    status: input.status,
  };
  if (input.linkedPlanItemId !== undefined) task.linkedPlanItemId = input.linkedPlanItemId;
  if (input.trigger !== undefined) task.trigger = input.trigger;

  return { ok: true, value: task };
}

export function updateTaskStatus(
  state: EntityState,
  taskId: TaskId,
  status: TaskStatus
): CommandResult<EntityState> {
  const validStatuses: TaskStatus[] = ['todo', 'done', 'skipped'];
  if (!validStatuses.includes(status)) {
    return { ok: false, error: `Invalid Task status: ${status}` };
  }
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) {
    return { ok: false, error: `Task ${taskId} not found` };
  }
  const updatedTasks = state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
  return {
    ok: true,
    value: {
      ...state,
      tasks: updatedTasks,
    },
  };
}
