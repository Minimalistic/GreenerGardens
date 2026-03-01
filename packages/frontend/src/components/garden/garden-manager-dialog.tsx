import { useState, useRef, useEffect } from 'react';
import { useGardens, useCreateGarden, useUpdateGarden, useDeleteGarden, useGardenDeletionImpact } from '@/hooks/use-gardens';
import { useGardenContext } from '@/contexts/garden-context';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import type { Garden } from '@gardenvault/shared';

interface GardenManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GardenManagerDialog({ open, onOpenChange }: GardenManagerDialogProps) {
  const { currentGardenId, setCurrentGardenId, clearCurrentGardenId } = useGardenContext();
  const { data: gardensData } = useGardens();
  const createGarden = useCreateGarden();
  const updateGarden = useUpdateGarden();
  const deleteGarden = useDeleteGarden();
  const { toast } = useToast();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gardenToDelete, setGardenToDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { data: impactData } = useGardenDeletionImpact(gardenToDelete, deleteDialogOpen);

  const gardens = gardensData?.data ?? [];

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (garden: Garden) => {
    setEditingId(garden.id);
    setEditingName(garden.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    try {
      await updateGarden.mutateAsync({ id: editingId, data: { name: trimmed } });
      toast({ title: 'Garden renamed' });
    } catch {
      toast({ title: 'Failed to rename garden', variant: 'destructive' });
    }
    cancelEditing();
  };

  const openDeleteDialog = (id: string) => {
    setGardenToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteGarden = async () => {
    if (!gardenToDelete) return;
    try {
      await deleteGarden.mutateAsync(gardenToDelete);
      if (gardenToDelete === currentGardenId) {
        clearCurrentGardenId();
      }
      setDeleteDialogOpen(false);
      setGardenToDelete(null);
      toast({ title: 'Garden deleted' });
    } catch {
      toast({ title: 'Failed to delete garden', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const result = await createGarden.mutateAsync({ name: trimmed });
      setCurrentGardenId(result.data.id);
      setNewName('');
      toast({ title: 'Garden created' });
    } catch {
      toast({ title: 'Failed to create garden', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Gardens</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {gardens.map((garden) => (
            <div
              key={garden.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted group"
            >
              {editingId === garden.id ? (
                <>
                  <Input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    className="h-7 text-sm flex-1"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditing}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">
                    {garden.name}
                    {garden.id === currentGardenId && (
                      <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditing(garden)}
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(garden.id)}
                    disabled={gardens.length <= 1}
                    title={gardens.length <= 1 ? 'Cannot delete the only garden' : 'Delete garden'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {gardens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No gardens yet. Create one below.
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="New garden name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || createGarden.isPending} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </DialogContent>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setGardenToDelete(null);
        }}
        title="Delete Garden?"
        description="This will permanently delete this garden and all its contents."
        impacts={impactData?.data ? [
          { label: 'Plots', count: impactData.data.plots },
          { label: 'Sub-plots', count: impactData.data.sub_plots },
          { label: 'Plant instances', count: impactData.data.plant_instances },
          { label: 'Harvests', count: impactData.data.harvests },
          { label: 'Soil tests', count: impactData.data.soil_tests },
          { label: 'Notes', count: impactData.data.notes },
        ] : undefined}
        loading={deleteGarden.isPending}
        onConfirm={confirmDeleteGarden}
      />
    </Dialog>
  );
}
