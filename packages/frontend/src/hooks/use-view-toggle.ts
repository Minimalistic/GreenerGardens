import { useState, useCallback } from 'react';

export function useViewToggle<T extends string>(
  storageKey: string,
  defaultView: T,
): [T, (view: T) => void] {
  const [view, setView] = useState<T>(
    () => (localStorage.getItem(storageKey) as T) ?? defaultView,
  );

  const toggleView = useCallback(
    (v: T) => {
      setView(v);
      localStorage.setItem(storageKey, v);
    },
    [storageKey],
  );

  return [view, toggleView];
}
