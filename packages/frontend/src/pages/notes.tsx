import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, StickyNote, Pin, Trash2, Pencil, Check, X, Calendar, Search, Type, LayoutGrid, TableIcon } from 'lucide-react';
import { NoteContent } from '@/components/notes/note-content';
import { DataTable, type Column } from '@/components/data-table';
import { useNotes, useCreateNote, useDeleteNote, useUpdateNote } from '@/hooks/use-notes';
import { entityLinkLabel, entityLinkPath } from '@/lib/note-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/contexts/undo-redo-context';
import type { Note } from '@gardenvault/shared';

interface EntityLink {
  entity_type: string;
  entity_id: string;
}

function CreateNoteDialog() {
  const [open, setOpen] = useState(false);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();
  const [content, setContent] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(false);

  const handleCreate = () => {
    if (!content.trim()) return;
    const noteContent = content.trim();
    createNote.mutate(
      { content: noteContent, content_type: isMarkdown ? 'markdown' : 'text' },
      {
        onSuccess: (result) => {
          const newId = result?.data?.id;
          if (newId) {
            pushUndo({
              label: 'Create note',
              undo: async () => { await deleteNote.mutateAsync(newId); },
              redo: async () => { await createNote.mutateAsync({ content: noteContent }); },
            });
          }
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={isMarkdown ? 'default' : 'outline'}
            onClick={() => setIsMarkdown(!isMarkdown)}
          >
            <Type className="w-4 h-4 mr-1" />
            Markdown
          </Button>
          <Button onClick={handleCreate} disabled={createNote.isPending} className="flex-1">
            {createNote.isPending ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const noteColumns: Column<Note>[] = [
  {
    key: 'created_at', label: 'Date',
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
  {
    key: 'content', label: 'Content',
    render: (row) => row.content.length > 80 ? row.content.slice(0, 80) + '…' : row.content,
  },
  {
    key: 'tags', label: 'Tags', sortable: false,
    render: (row) => row.tags?.length > 0 ? (
      <div className="flex gap-1 flex-wrap">
        {row.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
      </div>
    ) : '-',
  },
  {
    key: 'pinned', label: 'Pinned',
    render: (row) => row.pinned ? <Pin className="w-4 h-4 text-primary" /> : null,
    getValue: (row) => row.pinned ? 1 : 0,
  },
];

export function NotesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('notes-view') as 'card' | 'table') ?? 'card'
  );
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('notes-view', v);
  };
  const { data } = useNotes();
  const deleteNote = useDeleteNote();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const allNotes = data?.data ?? [];

  const notes = useMemo(() => {
    if (!searchQuery.trim()) return allNotes;
    const q = searchQuery.toLowerCase();
    return allNotes.filter(note =>
      note.content.toLowerCase().includes(q) ||
      note.tags?.some((tag: string) => tag.toLowerCase().includes(q))
    );
  }, [allNotes, searchQuery]);

  const togglePin = (id: string, pinned: boolean) => {
    updateNote.mutate({ id, pinned: !pinned }, {
      onSuccess: () => {
        pushUndo({
          label: pinned ? 'Unpin note' : 'Pin note',
          undo: async () => { await updateNote.mutateAsync({ id, pinned }); },
          redo: async () => { await updateNote.mutateAsync({ id, pinned: !pinned }); },
        });
        toast({ title: pinned ? 'Unpinned' : 'Pinned' });
      },
    });
  };

  const startEdit = (note: { id: string; content: string }) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    const note = notes.find(n => n.id === editingId);
    const oldContent = note?.content ?? '';
    const newContent = editContent.trim();
    const noteId = editingId;
    updateNote.mutate(
      { id: noteId, content: newContent },
      {
        onSuccess: () => {
          pushUndo({
            label: 'Edit note',
            undo: async () => { await updateNote.mutateAsync({ id: noteId, content: oldContent }); },
            redo: async () => { await updateNote.mutateAsync({ id: noteId, content: newContent }); },
          });
          setEditingId(null);
          setEditContent('');
          toast({ title: 'Note updated' });
        },
        onError: () => toast({ title: 'Failed to update note', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Garden Notes</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
          <CreateNoteDialog />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="pl-9"
        />
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchQuery ? 'No matching notes found.' : 'No notes yet. Start documenting your garden!'}</p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={notes as any} columns={noteColumns} searchable={false} exportFilename="garden-notes" />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className={note.pinned ? 'border-primary' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {note.pinned && (
                      <Badge variant="outline" className="mb-2"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>
                    )}
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          className="resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-1" />Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            disabled={updateNote.isPending || !editContent.trim()}
                          >
                            <Check className="w-4 h-4 mr-1" />Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <NoteContent content={note.content} contentType={note.content_type} />
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                          {note.note_date && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-muted"
                              onClick={() => navigate(`/calendar?date=${note.note_date}`)}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(note.note_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Badge>
                          )}
                          {note.entity_links?.length > 0 && note.entity_links.map((link: EntityLink) => {
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
                      </>
                    )}
                  </div>
                  {editingId !== note.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
                        onClick={() => {
                          if (!confirm('Delete this note?')) return;
                          deleteNote.mutate(note.id, {
                            onSuccess: () => {
                              pushUndo({
                                label: 'Delete note',
                                undo: async () => { await createNote.mutateAsync({ content: note.content, pinned: note.pinned, tags: note.tags, note_date: note.note_date, entity_links: note.entity_links }); },
                                redo: async () => { await deleteNote.mutateAsync(note.id); },
                              });
                              toast({ title: 'Deleted' });
                            },
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
