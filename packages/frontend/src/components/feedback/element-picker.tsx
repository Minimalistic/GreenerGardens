import { useEffect, useCallback, useRef } from 'react';

interface CapturedElement {
  text: string;
  tagName: string;
  dataAttr: string | null;
}

interface ElementPickerProps {
  onCapture: (element: CapturedElement) => void;
  onCancel: () => void;
}

export function ElementPicker({ onCapture, onCancel }: ElementPickerProps) {
  const highlightedRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const clearHighlight = useCallback(() => {
    if (highlightedRef.current) {
      highlightedRef.current.style.outline = '';
      highlightedRef.current.style.outlineOffset = '';
      highlightedRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || target === overlayRef.current) return;

    clearHighlight();
    highlightedRef.current = target;
    target.style.outline = '2px solid hsl(var(--primary))';
    target.style.outlineOffset = '2px';
  }, [clearHighlight]);

  const handleClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (!target || target === overlayRef.current) return;

    clearHighlight();

    const text = (target.textContent || '').trim().slice(0, 200);
    const tagName = target.tagName.toLowerCase();

    // Find closest data-* attribute
    let dataAttr: string | null = null;
    let el: HTMLElement | null = target;
    while (el) {
      const attrs = Array.from(el.attributes);
      const dataAttribute = attrs.find(a => a.name.startsWith('data-'));
      if (dataAttribute) {
        dataAttr = `${dataAttribute.name}="${dataAttribute.value}"`;
        break;
      }
      el = el.parentElement;
    }

    onCapture({ text, tagName, dataAttr });
  }, [clearHighlight, onCapture]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearHighlight();
      onCancel();
    }
  }, [clearHighlight, onCancel]);

  useEffect(() => {
    // Use capture phase so we intercept before anything else
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearHighlight();
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleMouseMove, handleClick, handleKeyDown, clearHighlight]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/20 cursor-crosshair"
      style={{ pointerEvents: 'none' }}
    >
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none">
        Click an element to capture it — Press Escape to cancel
      </div>
    </div>
  );
}
