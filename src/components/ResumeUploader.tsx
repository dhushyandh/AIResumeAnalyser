import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, CheckCircle, RefreshCw, AlertCircle, Copy } from "lucide-react";
import { extractTextFromPdf } from "../utils/pdfParser";

interface ResumeUploaderProps {
  onTextExtracted: (text: string, filename: string) => void;
  extractedFilename: string;
  initialText?: string;
}

export default function ResumeUploader({ onTextExtracted, extractedFilename, initialText = "" }: ResumeUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"file" | "paste">(initialText ? "paste" : "file");
  const [pastedText, setPastedText] = useState(initialText);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPdf(file);
        if (!text || text.trim() === "") {
          throw new Error("Could not extract any readable text from this PDF.");
        }
        onTextExtracted(text, file.name);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        onTextExtracted(text, file.name);
      } else if (file.name.endsWith(".docx")) {
        // Standard docx text-fallback: ask to paste or run light parse
        setError("Direct DOCX text extraction is limited in browser environments. Please copy-paste the text directly using the 'Paste Text' tab for perfect accuracy.");
        setMode("paste");
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or .txt file, or use the copy-paste editor.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while reading the file.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    onTextExtracted(text, text ? "Pasted Resume Text" : "");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-neutral-500" />
          <span>Resume / CV Upload</span>
        </h3>
        
        {/* Toggle Mode buttons */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setMode("file")}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === "file"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`px-3 py-1 rounded-md transition-colors ${
              mode === "paste"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            Paste Text
          </button>
        </div>
      </div>

      {mode === "file" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
            dragActive
              ? "border-neutral-950 dark:border-white bg-neutral-50/50 dark:bg-neutral-800/25"
              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-neutral-500" />
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Extracting text from document...</p>
            </div>
          ) : extractedFilename ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {extractedFilename}
              </p>
              <button
                onClick={triggerFileInput}
                className="text-xs text-neutral-500 hover:text-neutral-950 underline mt-2"
              >
                Choose another file
              </button>
            </div>
          ) : (
            <div className="space-y-3 cursor-pointer" onClick={triggerFileInput}>
              <div className="mx-auto w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center border border-neutral-100 dark:border-neutral-700">
                <Upload className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Drag and drop your file here, or <span className="text-neutral-950 dark:text-white underline">browse</span>
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Supports PDF or TXT files
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={pastedText}
            onChange={(e) => handlePasteChange(e.target.value)}
            placeholder="Paste the full text of your resume here (e.g. including contact info, summaries, experience, projects, education)..."
            rows={6}
            className="w-full text-sm p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 dark:text-neutral-200 resize-y"
          />
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>{pastedText ? `${pastedText.length} characters pasted` : "Ensure all formatted lines are included"}</span>
            {pastedText && (
              <button
                onClick={() => handlePasteChange("")}
                className="hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                Clear Text
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
