import { Button } from '@/components/ui/button';
import { LayoutGrid, TableIcon } from 'lucide-react';

interface ViewToggleButtonsProps<T extends string> {
  view: T;
  onToggle: (view: T) => void;
  /** The view value for the grid/card button (default: first option) */
  primaryView: T;
  /** The view value for the table button (default: 'table') */
  tableView: T;
}

export function ViewToggleButtons<T extends string>({
  view,
  onToggle,
  primaryView,
  tableView,
}: ViewToggleButtonsProps<T>) {
  return (
    <div className="flex gap-1">
      <Button variant={view === primaryView ? 'default' : 'outline'} size="sm" onClick={() => onToggle(primaryView)}>
        <LayoutGrid className="w-4 h-4" />
      </Button>
      <Button variant={view === tableView ? 'default' : 'outline'} size="sm" onClick={() => onToggle(tableView)}>
        <TableIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}
