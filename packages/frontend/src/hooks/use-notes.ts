import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface EntityLink {
  entity_type: string;
  entity_id: string;
}

interface Note {
  id: string;
  content: string;
  content_type: string;
  entity_links: EntityLink[];
  photo_ids: string[];
  tags: string[];
  pinned: boolean;
  note_date: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteCreate {
  content: string;
  content_type?: string;
  entity_links?: EntityLink[];
  photo_ids?: string[];
  tags?: string[];
  pinned?: boolean;
  note_date?: string | null;
}

export function useNotes(filters?: { pinned?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.pinned !== undefined) params.set('pinned', String(filters.pinned));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.notes.list(filters),
    queryFn: () => api.get<{ data: Note[] }>(`/notes${qs ? `?${qs}` : ''}`),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.detail(id!),
    queryFn: () => api.get<{ data: Note }>(`/notes/${id}`),
    enabled: !!id,
  });
}

export function useNotesByEntity(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.byEntity(entityType!, entityId!),
    queryFn: () => api.get<{ data: Note[] }>(`/notes/entity/${entityType}/${entityId}`),
    enabled: !!entityType && !!entityId,
  });
}

export function useNotesByDate(date: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.byDate(date!),
    queryFn: () => api.get<{ data: Note[] }>(`/notes/date/${date}`),
    enabled: !!date,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NoteCreate) => api.post<{ data: Note }>('/notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<NoteCreate>) =>
      api.patch<{ data: Note }>(`/notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
    },
  });
}
