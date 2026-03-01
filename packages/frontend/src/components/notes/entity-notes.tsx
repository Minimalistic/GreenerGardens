import { useState } from 'react';
import { Pin, Trash2, StickyNote } from 'lucide-react';
import { useNotesByEntity, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-notes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface EntityNotesProps {
  entityType: string;
  entityId: string;
}

export function EntityNotes({ entityType, entityId }: EntityNotesProps) {
  const { data } = useNotesByEntity(entityType, entityId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { toast } = useToast();
  const [content, setContent] = useState('');

  const notes = data?.data ?? [];

  const handleCreate = () => {
    if (!content.trim()) return;
    createNote.mutate(
      {
        content: content.trim(),
        entity_links: [{ entity_type: entityType, entity_id: entityId }],
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          Notes
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
                      onClick={() => togglePin(note.id, note.pinned)}
                    >
                      <Pin className={`w-3 h-3 ${note.pinned ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() =>
                        deleteNote.mutate(note.id, {
                          onSuccess: () => toast({ title: 'Deleted' }),
                        })
                      }
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
