import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUndoRedo } from '@/contexts/undo-redo-context';

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const undoShortcut = isMac ? '\u2318Z' : 'Ctrl+Z';
const redoShortcut = isMac ? '\u21E7\u2318Z' : 'Ctrl+Shift+Z';

export function UndoRedoControls() {
  const { canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useUndoRedo();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              onClick={() => undo()}
              className="h-8 w-8"
            >
              <Undo2 className="w-4 h-4" />
              <span className="sr-only">Undo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>{canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}</span>
            <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">{undoShortcut}</kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              onClick={() => redo()}
              className="h-8 w-8"
            >
              <Redo2 className="w-4 h-4" />
              <span className="sr-only">Redo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>{canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}</span>
            <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">{redoShortcut}</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
