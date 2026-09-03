import { useEffect, useId, useRef, useState } from 'react';
import { Image as ImageIcon, Trash, UploadSimple } from '@phosphor-icons/react';
import { ACCEPT_ATTRIBUTE, describeFileProblem } from '@/lib/feedback';
import { formatBytes } from '@/lib/release';

interface FileDropProps {
  file: File | null;
  onFile: (file: File | null) => void;
  onReject: (reason: string) => void;
  error?: string | undefined;
  disabled?: boolean;
}

/** Drag-and-drop screenshot picker with a real empty state and a live preview. */
export function FileDrop({ file, onFile, onReject, error, disabled = false }: FileDropProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = describeFileProblem(candidate);
    if (problem) {
      onReject(problem);
      return;
    }
    onFile(candidate);
  };

  if (file && preview) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-line-strong bg-surface p-3">
        <img
          src={preview}
          alt={`Preview of ${file.name}`}
          className="h-16 w-16 shrink-0 rounded-[8px] border border-line object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
          <p className="mt-0.5 text-xs text-muted">{formatBytes(file.size)} attached</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="inline-flex h-9 items-center gap-1.5 rounded-field px-2.5 text-xs font-semibold text-critical transition-colors hover:bg-critical-soft"
        >
          <Trash size={15} aria-hidden />
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) accept(event.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed px-5 py-7 text-center transition-colors duration-200 ${
          disabled
            ? 'cursor-not-allowed border-line bg-sunken opacity-60'
            : dragging
              ? 'border-brand bg-brand-tint'
              : error
                ? 'border-critical bg-critical-soft/40 hover:border-critical'
                : 'border-line-strong bg-surface hover:border-brand hover:bg-brand-tint'
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-brand-soft text-brand-deep">
          {dragging ? <UploadSimple size={20} aria-hidden /> : <ImageIcon size={20} aria-hidden />}
        </span>
        <span className="text-sm font-semibold text-ink">
          {dragging ? 'Drop it here' : 'Drag a screenshot in, or click to browse'}
        </span>
        <span className="text-xs text-muted">PNG, JPG or WebP up to 5 MB</span>
      </label>
    </div>
  );
}
