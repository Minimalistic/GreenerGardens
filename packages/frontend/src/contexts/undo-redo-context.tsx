import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const MAX_UNDO_STEPS = 50;

export interface UndoableAction {
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  undoCount: number;
  redoCount: number;
  push: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const UndoRedoContext = createContext<UndoRedoState | null>(null);

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const undoStack = useRef<UndoableAction[]>([]);
  const redoStack = useRef<UndoableAction[]>([]);
  const [revision, setRevision] = useState(0);
  const busyRef = useRef(false);
  const queryClient = useQueryClient();

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const push = useCallback((action: UndoableAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX_UNDO_STEPS) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    bump();
  }, [bump]);

  const handleUndo = useCallback(async () => {
    if (busyRef.current) return;
    const action = undoStack.current.pop();
    if (!action) return;
    busyRef.current = true;
    try {
      await action.undo();
      redoStack.current.push(action);
      queryClient.invalidateQueries();
    } catch {
      // Put it back if undo failed
      undoStack.current.push(action);
    } finally {
      busyRef.current = false;
      bump();
    }
  }, [bump, queryClient]);

  const handleRedo = useCallback(async () => {
    if (busyRef.current) return;
    const action = redoStack.current.pop();
    if (!action) return;
    busyRef.current = true;
    try {
      await action.redo();
      undoStack.current.push(action);
      queryClient.invalidateQueries();
    } catch {
      redoStack.current.push(action);
    } finally {
      busyRef.current = false;
      bump();
    }
  }, [bump, queryClient]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.target as HTMLElement)?.closest('[role="dialog"]')) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key !== 'z') return;

      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Read stacks after every revision change
  void revision;
  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  const undoLabel = canUndo ? undoStack.current[undoStack.current.length - 1].label : null;
  const redoLabel = canRedo ? redoStack.current[redoStack.current.length - 1].label : null;

  return (
    <UndoRedoContext.Provider
      value={{
        canUndo,
        canRedo,
        undoLabel,
        redoLabel,
        undoCount: undoStack.current.length,
        redoCount: redoStack.current.length,
        push,
        undo: handleUndo,
        redo: handleRedo,
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const ctx = useContext(UndoRedoContext);
  if (!ctx) throw new Error('useUndoRedo must be used within UndoRedoProvider');
  return ctx;
}
