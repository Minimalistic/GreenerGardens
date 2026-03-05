import { useState, useRef, useEffect } from 'react';
import { useGardenContext } from '@/contexts/garden-context';
import { useUpdateGarden } from '@/hooks/use-gardens';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GardenManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GardenManagerDialog({ open, onOpenChange }: GardenManagerDialogProps) {
  const { garden } = useGardenContext();
  const updateGarden = useUpdateGarden();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && garden) {
      setName(garden.name);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, garden]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !garden) return;
    try {
      await updateGarden.mutateAsync({ id: garden.id, data: { name: trimmed } });
      toast({ title: 'Garden renamed' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to rename garden', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Garden Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gardenName">Garden Name</Label>
            <Input
              ref={inputRef}
              id="gardenName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <Button onClick={handleSave} disabled={!name.trim() || updateGarden.isPending} className="w-full">
            {updateGarden.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
