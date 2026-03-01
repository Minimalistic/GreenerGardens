import { useEffect, useRef } from 'react';
import { Copy, CopyPlus, Eye, Trash2, ClipboardPaste } from 'lucide-react';

interface MenuPosition {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  position: MenuPosition;
  plotId: string | null;
  hasClipboard: boolean;
  onCopy: () => void;
  onDuplicate: () => void;
  onPaste: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const isMac = navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '\u2318' : 'Ctrl+';

export function CanvasContextMenu({
  position,
  plotId,
  hasClipboard,
  onCopy,
  onDuplicate,
  onPaste,
  onViewDetails,
  onDelete,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 50,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      role="menu"
    >
      {plotId ? (
        <>
          <MenuItem icon={Copy} label="Copy" shortcut={`${mod}C`} onClick={() => { onCopy(); onClose(); }} />
          <MenuItem icon={CopyPlus} label="Duplicate" shortcut={`${mod}D`} onClick={() => { onDuplicate(); onClose(); }} />
          <div className="my-1 h-px bg-border" />
          <MenuItem icon={Eye} label="View Details" onClick={() => { onViewDetails(); onClose(); }} />
          <div className="my-1 h-px bg-border" />
          <MenuItem icon={Trash2} label="Delete" shortcut="Del" variant="destructive" onClick={() => { onDelete(); onClose(); }} />
        </>
      ) : (
        <MenuItem
          icon={ClipboardPaste}
          label="Paste"
          shortcut={`${mod}V`}
          disabled={!hasClipboard}
          onClick={() => { onPaste(); onClose(); }}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  variant,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  variant?: 'destructive';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors
        ${disabled ? 'text-muted-foreground opacity-50 cursor-default' : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'}
        ${variant === 'destructive' && !disabled ? 'text-destructive hover:bg-destructive/10' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>}
    </button>
  );
}
