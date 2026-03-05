import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateFeedback } from '@/hooks/use-feedback';
import { useToast } from '@/hooks/use-toast';
import { ElementPicker } from './element-picker';
import { cn } from '@/lib/utils';

const TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'feedback', label: 'General Feedback' },
] as const;

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [picking, setPicking] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('medium');
  const [elementContext, setElementContext] = useState<string | null>(null);

  const location = useLocation();
  const createFeedback = useCreateFeedback();
  const { toast } = useToast();

  const resetForm = () => {
    setFeedbackType('bug');
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setElementContext(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFeedback.mutate(
      {
        feedback_type: feedbackType,
        title,
        description,
        severity: feedbackType === 'bug' ? severity : null,
        page_route: location.pathname,
        element_context: elementContext,
      },
      {
        onSuccess: () => {
          toast({ title: 'Feedback submitted — thank you!' });
          resetForm();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Failed to submit feedback', variant: 'destructive' });
        },
      },
    );
  };

  const handlePickElement = () => {
    onOpenChange(false);
    setPicking(true);
  };

  return (
    <>
      {picking &&
        createPortal(
          <ElementPicker
            onCapture={(el) => {
              const parts = [`<${el.tagName}>`, el.text && `"${el.text}"`, el.dataAttr && `[${el.dataAttr}]`].filter(Boolean);
              setElementContext(parts.join(' '));
              setPicking(false);
              onOpenChange(true);
            }}
            onCancel={() => {
              setPicking(false);
              onOpenChange(true);
            }}
          />,
          document.body,
        )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFeedbackType(t.value)}
                  className={cn(
                    'flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors',
                    feedbackType === t.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-title">Title</Label>
              <Input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-desc">Description</Label>
              <Textarea
                id="fb-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                rows={3}
                required
              />
            </div>

            {/* Severity — bugs only */}
            {feedbackType === 'bug' && (
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <div className="flex gap-1">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={cn(
                        'flex-1 text-xs font-medium py-1.5 rounded-md capitalize transition-colors',
                        severity === s
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Element picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Element Context</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handlePickElement}
                >
                  <Crosshair className="w-3 h-3 mr-1" />
                  Pick Element
                </Button>
              </div>
              {elementContext ? (
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-xs">
                  <span className="flex-1 truncate font-mono">{elementContext}</span>
                  <button type="button" onClick={() => setElementContext(null)}>
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Optionally click "Pick Element" to identify a UI element
                </p>
              )}
            </div>

            {/* Page route (auto-captured, read-only display) */}
            <p className="text-xs text-muted-foreground">
              Page: <span className="font-mono">{location.pathname}</span>
            </p>

            <Button
              type="submit"
              className="w-full"
              disabled={createFeedback.isPending || !title.trim() || !description.trim()}
            >
              {createFeedback.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
