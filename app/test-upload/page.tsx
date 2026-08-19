"use client";

import React, { useState } from "react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Toaster } from "sonner";

export default function TestUploadPage() {
  const [singleUrl, setSingleUrl] = useState<string>("");
  const [multiUrls, setMultiUrls] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" richColors />
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Cloudflare R2 Image Upload Demo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Test and verify the reusable <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">&lt;ImageUploader /&gt;</code> component with direct-to-R2 presigned URLs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Single Image Section */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Single Image Uploader
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <code className="text-xs font-mono">multiple={"{false}"}</code> — replaces previous selection upon new upload.
              </p>
            </div>

            <ImageUploader
              value={singleUrl}
              onChange={(val) => setSingleUrl(val as string)}
              folder="shoes"
              maxSizeMB={5}
            />

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Value:
              </span>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                {singleUrl || "(none)"}
              </p>
            </div>
          </div>

          {/* Multi Image Section */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Multi-Image Uploader
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <code className="text-xs font-mono">multiple={"{true}"}</code> — appends new uploads into a gallery array.
              </p>
            </div>

            <ImageUploader
              value={multiUrls}
              onChange={(val) => setMultiUrls(val as string[])}
              multiple={true}
              folder="products"
              maxSizeMB={10}
            />

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Values ({multiUrls.length}):
              </span>
              <div className="mt-1 max-h-32 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                {multiUrls.length > 0 ? (
                  multiUrls.map((url, idx) => (
                    <p key={idx} className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                      [{idx + 1}] {url}
                    </p>
                  ))
                ) : (
                  <p className="text-xs font-mono text-gray-400">(none)</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
