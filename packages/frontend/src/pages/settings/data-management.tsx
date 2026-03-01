import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useBackupList, useCreateBackup, useDeleteBackup, useIntegrityCheck, useVacuum } from '@/hooks/use-backup';
import { Download, Database, Shield, Trash2 } from 'lucide-react';

export function DataManagementSettings() {
  const { toast } = useToast();
  const { data: backupsData } = useBackupList();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const integrityCheck = useIntegrityCheck();
  const vacuum = useVacuum();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a complete copy of your garden database as a SQLite file. This backup can be opened with any SQLite viewer.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const a = document.createElement('a');
              a.href = '/api/v1/export/database-file';
              a.download = '';
              a.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Database Backup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={createBackup.isPending}
              onClick={async () => {
                try {
                  await createBackup.mutateAsync();
                  toast({ title: 'Backup created' });
                } catch {
                  toast({ title: 'Backup failed', variant: 'destructive' });
                }
              }}
            >
              {createBackup.isPending ? 'Creating...' : 'Create Backup'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={integrityCheck.isPending}
              onClick={async () => {
                try {
                  const result = await integrityCheck.mutateAsync();
                  toast({ title: `Integrity: ${result.data.result}` });
                } catch {
                  toast({ title: 'Check failed', variant: 'destructive' });
                }
              }}
            >
              <Shield className="w-4 h-4 mr-1" />
              {integrityCheck.isPending ? 'Checking...' : 'Integrity Check'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={vacuum.isPending}
              onClick={async () => {
                try {
                  await vacuum.mutateAsync();
                  toast({ title: 'VACUUM completed' });
                } catch {
                  toast({ title: 'VACUUM failed', variant: 'destructive' });
                }
              }}
            >
              {vacuum.isPending ? 'Running...' : 'Optimize DB'}
            </Button>
          </div>

          {backupsData?.data && backupsData.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Available Backups</p>
              {backupsData.data.map((b: any) => (
                <div key={b.filename} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted">
                  <div>
                    <span className="font-mono text-xs">{b.filename}</span>
                    <span className="text-muted-foreground ml-2">({(b.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = `/api/v1/backup/download/${b.filename}`;
                        a.download = '';
                        a.click();
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteBackup.mutateAsync(b.filename);
                          toast({ title: 'Backup deleted' });
                        } catch {
                          toast({ title: 'Delete failed', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
