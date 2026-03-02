import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, FlaskConical, Loader2 } from 'lucide-react';
import { useResetDatabase, useSeedTestData } from '@/hooks/use-admin';
import { useToast } from '@/hooks/use-toast';
import { useGardenContext } from '@/contexts/garden-context';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const { clearCurrentGardenId } = useGardenContext();
  const resetDatabase = useResetDatabase();
  const seedTestData = useSeedTestData();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'seed' | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const confirmPhrase = confirmAction === 'reset' ? 'DELETE EVERYTHING' : 'RESET AND SEED';

  function handleRequestReset() {
    setConfirmAction('reset');
    setConfirmText('');
    setConfirmOpen(true);
  }

  function handleRequestSeed() {
    setConfirmAction('seed');
    setConfirmText('');
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (confirmText !== confirmPhrase) return;

    try {
      if (confirmAction === 'reset') {
        await resetDatabase.mutateAsync();
        clearCurrentGardenId();
        toast({ title: 'Database cleared', description: 'All user data has been removed.' });
      } else {
        const result = await seedTestData.mutateAsync();
        clearCurrentGardenId();
        const s = result.data.summary;
        toast({
          title: 'Test data loaded',
          description: `Created ${s.gardens} gardens, ${s.plots} plots, ${s.plantInstances} plants, ${s.harvests} harvests, and more.`,
        });
      }
      setConfirmOpen(false);
      setConfirmAction(null);
      onOpenChange(false);
      // Reload to reset all state cleanly
      window.location.href = '/dashboard';
    } catch {
      toast({ title: 'Operation failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
  }

  const isLoading = resetDatabase.isPending || seedTestData.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Application settings and database management tools.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect your entire database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Clear Entire Database</p>
                    <p className="text-xs text-muted-foreground">
                      Removes all gardens, plots, plants, harvests, notes, and chats. Plant catalog is preserved.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRequestReset}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dev Options */}
            <Card className="border-amber-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <FlaskConical className="w-4 h-4" />
                  Dev Options
                </CardTitle>
                <CardDescription>
                  Developer tools for testing and demo purposes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Load Test Data</p>
                    <p className="text-xs text-muted-foreground">
                      Clears all existing data and populates the database with realistic test gardens, plots, plants, harvests, notes, tasks, and conversations.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 shrink-0"
                    onClick={handleRequestSeed}
                  >
                    <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                    Seed Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!isLoading) { setConfirmOpen(v); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction === 'reset' ? 'Clear Entire Database' : 'Reset & Load Test Data'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'reset'
                ? 'This will permanently delete all gardens, plots, plant instances, harvests, notes, tasks, pest events, soil tests, seed inventory, and chat history. The plant catalog will be preserved.'
                : 'This will permanently delete all existing data and replace it with test/demo data including sample gardens, plots, plants, harvests, notes, and more.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium">
              This action cannot be undone. Type <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{confirmPhrase}</code> to confirm.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={confirmText !== confirmPhrase || isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading
                ? 'Processing...'
                : confirmAction === 'reset'
                  ? 'Clear Database'
                  : 'Reset & Seed'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
