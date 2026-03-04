import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';

interface EditableDateFieldProps {
  value: string | null | undefined;
  onSave: (newDate: string) => Promise<void>;
  label: string;
  className?: string;
}

export function EditableDateField({ value, onSave, label, className }: EditableDateFieldProps) {
  const [editing, setEditing] = useState(false);

  const handleSave = async (newValue: string) => {
    if (newValue && newValue !== value) {
      await onSave(newValue);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type="date"
        defaultValue={value ?? ''}
        className={className}
        autoFocus
        onBlur={(e) => handleSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave((e.target as HTMLInputElement).value);
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1">
      {value
        ? new Date(value + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
        : <span className="text-muted-foreground italic">Not set</span>
      }
      <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
        <Pencil className="w-3 h-3" />
      </button>
    </span>
  );
}
