"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadAdminImageFile } from "@/lib/admin/upload-image-client";
import type { AdminUploadFolder } from "@/lib/firebase/admin-storage";
import {
  getAdminImageUploadHint,
  type AdminImageUploadHintVariant,
} from "@/lib/admin/image-upload-hints";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ImageUploadHint({ text }: { text: string }) {
  return (
    <p className="mt-1 max-w-2xl whitespace-pre-line rounded-md border border-border/80 bg-muted/40 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}

function parseImageUrls(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface AdminImageUrlFieldProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  folder: AdminUploadFolder;
  actorRole: string;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
  showSizeGuide?: boolean;
}

export function AdminImageUrlField({
  label = "Images",
  hint,
  value,
  onChange,
  folder,
  actorRole,
  rows = 3,
  disabled = false,
  placeholder = "https://...",
  showSizeGuide = true,
}: AdminImageUrlFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const urls = parseImageUrls(value);
  const resolvedHint =
    hint ?? (showSizeGuide ? getAdminImageUploadHint(folder, "gallery") : undefined);

  const removeUrl = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.join("\n"));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || disabled || uploading) return;

    setUploading(true);
    const nextUrls = [...urls];

    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        const url = await uploadAdminImageFile(files[i], folder);
        uploaded.push(url);
      }
      onChange([...uploaded, ...nextUrls].join("\n"));
      toast.success(
        files.length === 1 ? "Image uploaded and compressed" : `${files.length} images uploaded`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label>{label}</Label>
          {resolvedHint ? <ImageUploadHint text={resolvedHint} /> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading && progress
            ? `Uploading ${progress.current}/${progress.total}…`
            : "Upload images"}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {uploading && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            Compressing & uploading
            {progress ? ` (${progress.current} of ${progress.total})` : ""}…
          </span>
        </div>
      )}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={cn(
                "group relative h-16 w-20 overflow-hidden rounded-md border bg-muted",
                index === 0 && "ring-2 ring-primary/40"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-0 top-0 rounded-br bg-primary px-1 py-0.5 text-[9px] font-medium text-primary-foreground">
                  Main
                </span>
              )}
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => removeUrl(index)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-40"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || uploading}
        className={cn(uploading && "opacity-60")}
      />
    </div>
  );
}

interface AdminSingleImageUploadProps {
  label?: string;
  hint?: string;
  folder: AdminUploadFolder;
  actorRole: string;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  hintVariant?: AdminImageUploadHintVariant;
  showSizeGuide?: boolean;
}

export function AdminSingleImageUpload({
  label = "Upload image",
  hint,
  folder,
  actorRole,
  disabled = false,
  onUploaded,
  hintVariant = "blog-featured",
  showSizeGuide = true,
}: AdminSingleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const resolvedHint =
    hint ?? (showSizeGuide ? getAdminImageUploadHint(folder, hintVariant) : undefined);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled || uploading) return;

    setUploading(true);
    try {
      const url = await uploadAdminImageFile(file, folder);
      onUploaded(url);
      toast.success("Image uploaded and compressed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? "Compressing & uploading…" : label}
      </Button>
      {resolvedHint ? <ImageUploadHint text={resolvedHint} /> : null}
      {uploading && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Compressing & uploading image…</span>
        </div>
      )}
    </div>
  );
}
