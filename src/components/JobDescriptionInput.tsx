import { useState, useRef, ChangeEvent } from "react";
import { Briefcase, Upload, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { extractTextFromPdf } from "../utils/pdfParser";

interface JobDescriptionInputProps {
  onTextExtracted: (text: string, filename: string) => void;
  extractedFilename: string;
  initialText?: string;
}

export default function JobDescriptionInput({ onTextExtracted, extractedFilename, initialText = "" }: JobDescriptionInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState(initialText);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setPastedText(text);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        onTextExtracted(text, file.name);
        setPastedText(text);
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or TXT file.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while reading the file.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    onTextExtracted(text, text ? "Pasted Job Description" : "");
  };

  return (
    <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-neutral-500" />
          <span>Job Description (Optional)</span>
        </h3>
        
        {/* Upload JD action */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : extractedFilename && extractedFilename !== "Pasted Job Description" ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{extractedFilename && extractedFilename !== "Pasted Job Description" ? "Uploaded PDF" : "Upload PDF"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={pastedText}
          onChange={(e) => handlePasteChange(e.target.value)}
          placeholder="Paste the target job description here to compare keyword alignment, skill gaps, and ATS matching requirements..."
          rows={6}
          className="w-full text-sm p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 dark:text-neutral-200 resize-y"
        />
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>
            {extractedFilename && extractedFilename !== "Pasted Job Description"
              ? `Loaded from: ${extractedFilename}`
              : pastedText
              ? `${pastedText.length} characters pasted`
              : "Paste description for high-fidelity matching"}
          </span>
          {pastedText && (
            <button
              onClick={() => {
                handlePasteChange("");
                onTextExtracted("", "");
              }}
              className="hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
