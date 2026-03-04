import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

const DEFAULT_SIDEBAR_WIDTH = 400;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 600;

interface AssistantContextValue {
  isOpen: boolean;
  sidebarWidth: number;
  activeConvId: string | null;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveConvId: (id: string | null) => void;
  minSidebarWidth: number;
  maxSidebarWidth: number;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

const STORAGE_KEY_CONV = 'gardenvault_assistant_conv';
const STORAGE_KEY_WIDTH = 'gardenvault_assistant_width';

function getStoredConvId(): string | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY_CONV);
    return id && id.trim().length > 0 ? id : null;
  } catch {
    return null;
  }
}

function getStoredWidth(): number {
  try {
    const w = Number(localStorage.getItem(STORAGE_KEY_WIDTH));
    if (w >= MIN_SIDEBAR_WIDTH && w <= MAX_SIDEBAR_WIDTH) return w;
  } catch {
    /* ignore */
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarWidth, setWidth] = useState(getStoredWidth);
  const [activeConvId, setConvId] = useState<string | null>(getStoredConvId);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const setSidebarWidth = useCallback((w: number) => {
    const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, w));
    setWidth(clamped);
    localStorage.setItem(STORAGE_KEY_WIDTH, String(clamped));
  }, []);

  const setActiveConvId = useCallback((id: string | null) => {
    setConvId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY_CONV, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_CONV);
    }
  }, []);

  const value = useMemo(() => ({
    isOpen,
    sidebarWidth,
    activeConvId,
    toggle,
    open,
    close,
    setSidebarWidth,
    setActiveConvId,
    minSidebarWidth: MIN_SIDEBAR_WIDTH,
    maxSidebarWidth: MAX_SIDEBAR_WIDTH,
  }), [isOpen, sidebarWidth, activeConvId, toggle, open, close, setSidebarWidth, setActiveConvId]);

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistantContext must be used within AssistantProvider');
  return ctx;
}
