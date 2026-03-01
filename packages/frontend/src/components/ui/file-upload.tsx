import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadFile } from '@/hooks/use-uploads';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUploaded?: (upload: { id: string; url: string; original_name: string }) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({ onUploaded, accept = 'image/*', maxSizeMB = 10 }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: `File too large. Maximum ${maxSizeMB}MB`, variant: 'destructive' });
      return;
    }

    // Preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    uploadFile.mutate(file, {
      onSuccess: (result) => {
        toast({ title: 'File uploaded' });
        onUploaded?.(result.data);
      },
      onError: () => {
        toast({ title: 'Upload failed', variant: 'destructive' });
        setPreview(null);
      },
    });
  }, [maxSizeMB, onUploaded, uploadFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />

      {uploadFile.isPending ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Uploading...</span>
        </div>
      ) : preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded" />
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-0 right-0"
            onClick={e => { e.stopPropagation(); setPreview(null); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 cursor-pointer">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drop an image or click to upload
          </span>
          <span className="text-xs text-muted-foreground">Max {maxSizeMB}MB</span>
        </div>
      )}
    </div>
  );
}
