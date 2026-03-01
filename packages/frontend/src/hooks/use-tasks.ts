import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse } from '@gardenvault/shared';

interface Task {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  task_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  is_recurring: boolean;
  recurrence_rule: string;
  priority: string;
  status: string;
  auto_generated: boolean;
  source_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskCreate {
  title: string;
  description?: string;
  task_type?: string;
  due_date?: string;
  priority?: string;
  entity_type?: string;
  entity_id?: string;
}

export function useTasks(filters?: {
  status?: string;
  priority?: string;
  task_type?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.task_type) params.set('task_type', filters.task_type);
  const qs = params.toString();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.get<ApiResponse<Task[]>>(`/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => api.get<ApiResponse<Task[]>>('/tasks/overdue'),
  });
}

export function useTodayTasks() {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => api.get<ApiResponse<Task[]>>('/tasks/today'),
  });
}

export function useWeekTasks() {
  return useQuery({
    queryKey: ['tasks', 'week'],
    queryFn: () => api.get<ApiResponse<Task[]>>('/tasks/week'),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskCreate) =>
      api.post<ApiResponse<Task>>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskCreate & { status: string; due_date: string }> }) =>
      api.patch<ApiResponse<Task>>(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Task>>(`/tasks/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useSkipTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Task>>(`/tasks/${id}/skip`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export type { Task, TaskCreate };
