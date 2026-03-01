import { useEffect } from 'react';

interface CanvasKeyboardActions {
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onEscape?: () => void;
}

/**
 * Window-level keyboard shortcuts for the garden canvas.
 * Skips events when focus is in inputs, textareas, selects, or when a dialog is open.
 */
export function useCanvasKeyboard(actions: CanvasKeyboardActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.target as HTMLElement)?.closest('[role="dialog"]')) return;

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        actions.onDelete?.();
        return;
      }
      if (e.key === 'Escape') {
        actions.onEscape?.();
        return;
      }
      if (mod && e.key === 'c') {
        e.preventDefault();
        actions.onCopy?.();
        return;
      }
      if (mod && e.key === 'v') {
        e.preventDefault();
        actions.onPaste?.();
        return;
      }
      if (mod && e.key === 'd') {
        e.preventDefault();
        actions.onDuplicate?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
