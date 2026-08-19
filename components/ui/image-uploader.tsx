"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  X,
  Loader2,
  ImageIcon,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export interface ImageUploaderProps {
  /** Single URL or array of URLs for controlled usage */
  value?: string | string[];
  /** Callback fired whenever the uploaded images list changes */
  onChange?: (value: string | string[]) => void;
  /** Callback fired when an upload batch completes successfully */
  onUploadComplete?: (newUrls: string[]) => void;
  /** Allow uploading multiple images (default: false) */
  multiple?: boolean;
  /** Maximum file size allowed in Megabytes (default: 5) */
  maxSizeMB?: number;
  /** Subfolder in R2 bucket (default: "uploads") */
  folder?: string;
  /** Disable uploading and removing files */
  disabled?: boolean;
  /** Optional custom CSS class for container */
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
  url?: string;
}

export function ImageUploader({
  value,
  onChange,
  onUploadComplete,
  multiple = false,
  maxSizeMB = 5,
  folder = "uploads",
  disabled = false,
  className = "",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize current value into an array of URLs
  const currentUrls: string[] = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return typeof value === "string" && value.trim() ? [value] : [];
  }, [value]);

  const updateUrls = useCallback(
    (newUrls: string[]) => {
      if (!onChange) return;
      if (multiple) {
        onChange(newUrls);
      } else {
        onChange(newUrls[0] || "");
      }
    },
    [onChange, multiple]
  );

  const uploadSingleFile = async (fileItem: UploadingFile): Promise<string> => {
    const { file } = fileItem;

    // Helper: Server-side upload fallback via FormData
    const uploadViaServer = async (): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server upload failed (${res.status})`);
      }

      const data = await res.json();
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === fileItem.id
            ? { ...item, progress: 100, url: data.publicUrl }
            : item
        )
      );
      return data.publicUrl;
    };

    try {
      // Step 1: Request presigned URL
      const res = await fetch("/api/r2/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder,
        }),
      });

      if (!res.ok) {
        // Fall back to server upload route
        return await uploadViaServer();
      }

      const { uploadUrl, publicUrl } = await res.json();

      // Step 2: Upload file binary directly to Cloudflare R2 with XHR progress listener
      return await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadingFiles((prev) =>
              prev.map((item) =>
                item.id === fileItem.id ? { ...item, progress: percent } : item
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadingFiles((prev) =>
              prev.map((item) =>
                item.id === fileItem.id
                  ? { ...item, progress: 100, url: publicUrl }
                  : item
              )
            );
            resolve(publicUrl);
          } else {
            // Non-200 status -> try server fallback
            uploadViaServer().then(resolve).catch(reject);
          }
        };

        xhr.onerror = () => {
          // Browser Network / CORS error -> fallback seamlessly to server route
          uploadViaServer().then(resolve).catch(reject);
        };

        xhr.send(file);
      });
    } catch (err) {
      return await uploadViaServer();
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter to single file if multiple is false
    const selectedFiles = multiple ? fileArray : [fileArray[0]];

    // Validate files
    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" exceeds maximum size of ${maxSizeMB}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newUploadItems: UploadingFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadItems]);

    const successfullyUploadedUrls: string[] = [];

    // Process uploads concurrently
    await Promise.all(
      newUploadItems.map(async (item) => {
        try {
          const publicUrl = await uploadSingleFile(item);
          successfullyUploadedUrls.push(publicUrl);
        } catch (err: any) {
          const errMsg = err?.message || "Upload failed";
          toast.error(`Failed to upload ${item.file.name}: ${errMsg}`);
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, error: errMsg } : f))
          );
        }
      })
    );

    // Remove completed upload progress items after a short delay
    setTimeout(() => {
      setUploadingFiles((prev) =>
        prev.filter((item) => !successfullyUploadedUrls.includes(item.url || ""))
      );
    }, 600);

    if (successfullyUploadedUrls.length > 0) {
      const nextUrls = multiple
        ? [...currentUrls, ...successfullyUploadedUrls]
        : [successfullyUploadedUrls[0]];

      updateUrls(nextUrls);
      if (onUploadComplete) {
        onUploadComplete(successfullyUploadedUrls);
      }
      toast.success(
        `Successfully uploaded ${successfullyUploadedUrls.length} ${
          successfullyUploadedUrls.length === 1 ? "image" : "images"
        }!`
      );
    }
  };

  const handleRemove = (urlToRemove: string) => {
    if (disabled) return;
    const nextUrls = currentUrls.filter((url) => url !== urlToRemove);
    updateUrls(nextUrls);
    toast.info("Image removed");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      {(!multiple && currentUrls.length > 0) ? null : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/10 scale-[0.99]"
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
            multiple={multiple}
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                PNG, JPG, WebP, GIF up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bars for Active Uploads */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[200px] text-gray-700 dark:text-gray-300">
                  {item.file.name}
                </span>
                <span className="text-gray-500">
                  {item.error ? (
                    <span className="text-red-500">{item.error}</span>
                  ) : item.progress === 100 ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    `${item.progress}%`
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    item.error ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Thumbnails Grid */}
      {currentUrls.length > 0 && (
        <div
          className={`grid gap-3 ${
            multiple
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
              : "grid-cols-1 max-w-xs"
          }`}
        >
          {currentUrls.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Uploaded ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-md"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
