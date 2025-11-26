import React, { useRef, useState, useEffect } from "react";

export default function Dropzone({ onResult }) {
  const inputRef = useRef();
  const previewContainerRef = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileObj, setFileObj] = useState(null);
  const [previewHeight, setPreviewHeight] = useState(null);

  const MAX_PREVIEW_HEIGHT = 720;

  useEffect(() => {
    return () => {
      if (fileObj && fileObj.url) URL.revokeObjectURL(fileObj.url);
    };
  }, [fileObj]);

  async function uploadFile(file) {
    setError("");
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const type = file.type;
    const name = file.name;

    if (fileObj && fileObj.url) URL.revokeObjectURL(fileObj.url);
    setPreviewHeight(null);
    setFileObj({ file, url, type, name });

    const form = new FormData();
    form.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(
        "https://social-media-content-analyzer-872p.onrender.com/api/upload",
        {
          method: "POST",
          body: form,
        }
      );
      const j = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(j.error || "Upload failed");
        return;
      }

      onResult(j);
    } catch (e) {
      setLoading(false);
      setError("Upload failed: " + e.message);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    uploadFile(f);
  }

  function handlePick(e) {
    const f = e.target.files && e.target.files[0];
    uploadFile(f);
  }
  const isImage = fileObj && fileObj.type.startsWith("image/");
  const isPdf = fileObj && fileObj.type === "application/pdf";

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current && inputRef.current.click()}
        className="group relative rounded-2xl p-6 md:p-8 cursor-pointer bg-gradient-to-b from-white to-indigo-50 border border-indigo-100 shadow-lg"
        style={{ minHeight: 160 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handlePick}
        />

        {!fileObj && (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100/80 shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14"
                />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-gray-700 font-medium text-lg">
                Drag & drop a PDF or image here
              </p>
              <p className="mt-1 text-indigo-600 font-semibold underline decoration-dotted">
                or click to pick a file
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Max size 10 MB • Text extraction up to 1000 words
              </p>
            </div>
          </div>
        )}

        {fileObj && (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Preview Centered */}
            <div
              ref={previewContainerRef}
              className="w-full max-w-3xl bg-white rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 shadow-sm"
              style={{
                height: previewHeight ? `${previewHeight}px` : undefined,
                minHeight: 200,
              }}
            >
              {isImage && (
                <img
                  src={fileObj.url}
                  alt={fileObj.name}
                  className="max-h-full max-w-full object-contain"
                  onLoad={(e) => {
                    try {
                      const img = e.target;
                      const naturalW = img.naturalWidth || 1;
                      const naturalH = img.naturalHeight || 1;
                      const containerWidth =
                        (previewContainerRef.current &&
                          previewContainerRef.current.clientWidth) ||
                        Math.round(window.innerWidth * 0.6);
                      const scale = Math.min(1, containerWidth / naturalW);
                      const desired = Math.min(
                        MAX_PREVIEW_HEIGHT,
                        Math.round(naturalH * scale)
                      );
                      setPreviewHeight(desired);
                    } catch {
                      setPreviewHeight(null);
                    }
                  }}
                />
              )}

              {isPdf && (
                <embed
                  src={fileObj.url}
                  type="application/pdf"
                  width="100%"
                  height={previewHeight ? `${previewHeight}px` : "600px"}
                  style={{ minHeight: 260 }}
                />
              )}

              {!isImage && !isPdf && (
                <div className="text-center p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-gray-400 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="text-sm text-gray-500 mt-2">
                    Preview not available
                  </p>
                </div>
              )}
            </div>

            {/* Filename + Buttons + Status BELOW PREVIEW */}
            <div className="w-full max-w-3xl flex flex-col items-center gap-3 text-center">
              <div>
                <p className="text-sm text-gray-500">Selected file</p>
                <p className="font-medium text-gray-800">{fileObj.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(fileObj.file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {loading && (
                <p className="text-indigo-600 font-medium animate-pulse text-sm">
                  Wait, your file is being processed....
                </p>
              )}

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* small helper when there is an error even outside box */}
      {!fileObj && error && (
        <p className="text-red-500 mt-2 text-sm font-medium">{error}</p>
      )}
    </div>
  );
}
