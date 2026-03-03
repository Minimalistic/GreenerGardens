import { useState } from 'react';
import { Pin, Trash2, StickyNote, Pencil, Check, X } from 'lucide-react';
import { useNotesByDate, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-notes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DayNotesProps {
  date: string;
}

export function DayNotes({ date }: DayNotesProps) {
  const { data } = useNotesByDate(date);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const notes = data?.data ?? [];

  const handleCreate = () => {
    if (!content.trim()) return;
    createNote.mutate(
      {
        content: content.trim(),
        note_date: date,
      },
      {
        onSuccess: () => {
          setContent('');
          toast({ title: 'Note added' });
        },
        onError: () => toast({ title: 'Failed to add note', variant: 'destructive' }),
      },
    );
  };

  const togglePin = (id: string, pinned: boolean) => {
    updateNote.mutate(
      { id, pinned: !pinned },
      { onSuccess: () => toast({ title: pinned ? 'Unpinned' : 'Pinned' }) },
    );
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateNote.mutate(
      { id: editingId, content: editContent.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditContent('');
          toast({ title: 'Note updated' });
        },
        onError: () => toast({ title: 'Failed to update note', variant: 'destructive' }),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          Day Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="resize-none"
          />
          {content.trim() && (
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createNote.isPending}
              className="w-full"
            >
              {createNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          )}
        </div>

        {notes.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className={`text-sm rounded-md border p-2 ${note.pinned ? 'border-primary' : ''}`}
              >
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-primary"
                        onClick={saveEdit}
                        disabled={updateNote.isPending || !editContent.trim()}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEdit(note)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => togglePin(note.id, note.pinned)}
                        >
                          <Pin className={`w-3 h-3 ${note.pinned ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            if (!confirm('Delete this note?')) return;
                            deleteNote.mutate(note.id, {
                              onSuccess: () => toast({ title: 'Deleted' }),
                            });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
