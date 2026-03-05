import Markdown from 'react-markdown';

interface NoteContentProps {
  content: string;
  contentType?: string;
  className?: string;
}

export function NoteContent({ content, contentType, className }: NoteContentProps) {
  if (contentType === 'markdown') {
    return (
      <div className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ''}`}>
        <Markdown>{content}</Markdown>
      </div>
    );
  }

  return <p className={`whitespace-pre-wrap ${className ?? ''}`}>{content}</p>;
}
