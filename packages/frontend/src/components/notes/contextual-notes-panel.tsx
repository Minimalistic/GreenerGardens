import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Pin, Trash2, StickyNote, Pencil, Check, X, Type } from 'lucide-react';
import { NoteContent } from '@/components/notes/note-content';
import { useContextualNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-notes';
import { entityLinkLabel, entityLinkPath } from '@/lib/note-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/contexts/undo-redo-context';
import { formatDistanceToNow } from 'date-fns';

interface ContextualNotesPanelProps {
  entityType: string;
  entityId: string;
  entityName?: string;
}

export function ContextualNotesPanel({ entityType, entityId, entityName }: ContextualNotesPanelProps) {
  const navigate = useNavigate();
  const { data } = useContextualNotes(entityType, entityId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();

  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [isMarkdown, setIsMarkdown] = useState(false);

  const groups = data?.data?.groups ?? [];
  const total = data?.data?.total ?? 0;

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleCreate = () => {
    if (!content.trim()) return;
    const noteContent = content.trim();
    const noteData = { content: noteContent, content_type: isMarkdown ? 'markdown' as const : 'text' as const, entity_links: [{ entity_type: entityType, entity_id: entityId }] };
    createNote.mutate(noteData, {
      onSuccess: (result) => {
        const newId = result?.data?.id;
        if (newId) {
          pushUndo({
            label: 'Add note',
            undo: async () => { await deleteNote.mutateAsync(newId); },
            redo: async () => { await createNote.mutateAsync(noteData); },
          });
        }
        setContent('');
        toast({ title: 'Note added' });
      },
      onError: () => toast({ title: 'Failed to add note', variant: 'destructive' }),
    });
  };

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

  const saveEdit = (allNotes: any[]) => {
    if (!editingId || !editContent.trim()) return;
    const note = allNotes.find(n => n.id === editingId);
    const oldContent = note?.content ?? '';
    const newContent = editContent.trim();
    const noteId = editingId;
    updateNote.mutate({ id: noteId, content: newContent }, {
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
    });
  };

  const allNotes = groups.flatMap(g => g.notes);

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Notes
              {total > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">{total}</span>
              )}
              {expanded ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Add note textarea */}
            <div className="space-y-2">
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Add a note to ${entityName ?? entityType}...`}
                rows={2}
                className="resize-none"
              />
              {content.trim() && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant={isMarkdown ? 'default' : 'outline'}
                    className="h-8 w-8 shrink-0"
                    onClick={() => setIsMarkdown(!isMarkdown)}
                    title="Toggle markdown"
                  >
                    <Type className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={createNote.isPending}
                    className="flex-1"
                  >
                    {createNote.isPending ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>
              )}
            </div>

            {/* Grouped notes */}
            {groups.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {groups.map(group => {
                  const key = `${group.entity_type}:${group.entity_id}`;
                  const isOpen = openGroups.has(key);
                  const isSelf = group.entity_type === entityType && group.entity_id === entityId;
                  const path = !isSelf ? entityLinkPath(group.entity_type, group.entity_id) : null;

                  return (
                    <div key={key}>
                      <button
                        className="w-full flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                        onClick={() => toggleGroup(key)}
                      >
                        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="truncate">
                          {isSelf ? (entityName ?? entityLinkLabel(entityType)) : group.entity_name}
                        </span>
                        <span className="ml-auto text-xs opacity-70">{group.notes.length}</span>
                        {path && (
                          <span
                            className="text-primary hover:underline ml-1"
                            onClick={e => { e.stopPropagation(); navigate(path); }}
                          >
                            view
                          </span>
                        )}
                      </button>

                      {isOpen && (
                        <div className="space-y-2 ml-4 mt-1">
                          {group.notes.map(note => (
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
                                      onClick={() => saveEdit(allNotes)}
                                      disabled={updateNote.isPending || !editContent.trim()}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <NoteContent content={note.content} contentType={note.content_type} className="text-sm" />
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(note)}>
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => togglePin(note.id, note.pinned)}>
                                        <Pin className={`w-3 h-3 ${note.pinned ? 'text-primary' : ''}`} />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => {
                                          if (!confirm('Delete this note?')) return;
                                          deleteNote.mutate(note.id, {
                                            onSuccess: () => {
                                              pushUndo({
                                                label: 'Delete note',
                                                undo: async () => { await createNote.mutateAsync({ content: note.content, entity_links: note.entity_links, pinned: note.pinned, tags: note.tags, note_date: note.note_date }); },
                                                redo: async () => { await deleteNote.mutateAsync(note.id); },
                                              });
                                              toast({ title: 'Deleted' });
                                            },
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
