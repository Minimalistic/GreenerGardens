import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, StickyNote, Pin, Trash2 } from 'lucide-react';
import { useNotes, useCreateNote, useDeleteNote, useUpdateNote } from '@/hooks/use-notes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

function CreateNoteDialog() {
  const [open, setOpen] = useState(false);
  const createNote = useCreateNote();
  const { toast } = useToast();
  const [content, setContent] = useState('');

  const handleCreate = () => {
    if (!content.trim()) return;
    createNote.mutate(
      { content },
      {
        onSuccess: () => {
          toast({ title: 'Note created' });
          setOpen(false);
          setContent('');
        },
        onError: () => toast({ title: 'Failed to create note', variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Note</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Note</DialogTitle></DialogHeader>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your garden note..."
          rows={6}
        />
        <Button onClick={handleCreate} disabled={createNote.isPending} className="w-full">
          {createNote.isPending ? 'Saving...' : 'Save Note'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function entityLinkLabel(type: string): string {
  switch (type) {
    case 'plot': return 'Plot';
    case 'plant_instance': return 'Plant';
    default: return type;
  }
}

function entityLinkPath(type: string, id: string): string | null {
  switch (type) {
    case 'plot': return `/garden/plots/${id}`;
    case 'plant_instance': return `/plants/${id}`;
    default: return null;
  }
}

export function NotesPage() {
  const navigate = useNavigate();
  const { data } = useNotes();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const { toast } = useToast();

  const notes = data?.data ?? [];

  const togglePin = (id: string, pinned: boolean) => {
    updateNote.mutate({ id, pinned: !pinned }, {
      onSuccess: () => toast({ title: pinned ? 'Unpinned' : 'Pinned' }),
    });
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Garden Notes</h2>
        <CreateNoteDialog />
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notes yet. Start documenting your garden!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <Card key={note.id} className={note.pinned ? 'border-primary' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {note.pinned && (
                      <Badge variant="outline" className="mb-2"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>
                    )}
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                      {note.tags?.length > 0 && note.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {note.entity_links?.length > 0 && note.entity_links.map((link: any) => {
                        const path = entityLinkPath(link.entity_type, link.entity_id);
                        return (
                          <Badge
                            key={`${link.entity_type}-${link.entity_id}`}
                            variant="outline"
                            className={`text-xs ${path ? 'cursor-pointer hover:bg-muted' : ''}`}
                            onClick={path ? () => navigate(path) : undefined}
                          >
                            {entityLinkLabel(link.entity_type)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePin(note.id, note.pinned)}
                    >
                      <Pin className={`w-4 h-4 ${note.pinned ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNote.mutate(note.id, { onSuccess: () => toast({ title: 'Deleted' }) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
