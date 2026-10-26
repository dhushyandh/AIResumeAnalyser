import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Sparkles, Clipboard, Check, RefreshCw, Bookmark, Trash2, Library } from "lucide-react";
import { useUser } from "./ClerkAuth";

interface CoverLetterGeneratorProps {
  resumeText: string;
  jobDescriptionText: string;
  resumeId?: string | null;
  jdId?: string | null;
}

export default function CoverLetterGenerator({ resumeText, jobDescriptionText, resumeId, jdId }: CoverLetterGeneratorProps) {
  const { isSignedIn, user } = useUser();
  const [style, setStyle] = useState<string>("formal");
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedLetters, setSavedLetters] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const loadSavedLetters = async () => {
    if (isSignedIn && user) {
      try {
        const res = await fetch("/api/cover-letters", {
          headers: { "x-user-id": user.id }
        });
        if (res.ok) {
          const data = await res.json();
          setSavedLetters(data);
        }
      } catch (err) {
        console.error("Failed to load cover letters:", err);
      }
    }
  };

  useEffect(() => {
    loadSavedLetters();
  }, [isSignedIn, user]);

  const handleSave = async () => {
    if (!coverLetter.trim() || !user) return;
    setSaveLoading(true);
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({
          resumeId: resumeId || null,
          jobDescriptionId: jdId || null,
          content: coverLetter,
          style: style
        })
      });
      if (res.ok) {
        alert("Cover letter successfully saved to library!");
        loadSavedLetters();
      } else {
        alert("Failed to save cover letter.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string, e: any) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm("Are you sure you want to delete this cover letter?")) return;
    try {
      const res = await fetch(`/api/cover-letters/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id }
      });
      if (res.ok) {
        setSavedLetters(prev => prev.filter(letter => letter.id !== id));
        if (coverLetter === savedLetters.find(l => l.id === id)?.content) {
          setCoverLetter("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const styles = [
    { id: "formal", label: "Corporate & Formal", desc: "Structured, credible & compliance-friendly (Healthcare, Legal, Finance)" },
    { id: "executive", label: "Executive & Leadership", desc: "High-level vision, ROI, governance & strategic stewardship" },
    { id: "impact", label: "Results & Metrics-Driven", desc: "Focused on quantifiable KPIs, outcomes & problem-solving" },
    { id: "creative", label: "Engaging & Modern", desc: "Dynamic storytelling, adaptability & innovation (Marketing, Sales, Design)" }
  ];

  const handleGenerate = async () => {
    if (!resumeText || !jobDescriptionText) return;
    setLoading(true);
    setCoverLetter("");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescriptionText, style }),
      });
      const data = await res.json();
      if (data.coverLetterText) {
        setCoverLetter(data.coverLetterText);
      } else {
        setCoverLetter(data.error || "Failed to generate cover letter.");
      }
    } catch (err) {
      setCoverLetter("Error connecting to cover letter service.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          <span>Tailored Cover Letter Generator</span>
        </h3>
        <p className="text-xs text-neutral-400">
          Generate an elegant, high-converting cover letter based on your matched resume and job description details.
        </p>
      </div>

      {!resumeText || !jobDescriptionText ? (
        <div className="bg-neutral-50 dark:bg-neutral-950 p-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400 text-xs">
          Please upload or paste both your Resume and Job Description to enable Cover Letter generation.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Choose Pitch Tone Style:</span>
            <div className="space-y-2">
              {styles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id as any)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    style === s.id
                      ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm font-semibold"
                      : "border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className={`text-[10px] mt-0.5 ${style === s.id ? "text-neutral-300 dark:text-neutral-500" : "text-neutral-400"}`}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Drafting Cover Letter...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Generate Letter</span>
                </>
              )}
            </button>

            {/* Saved Library */}
            {isSignedIn && savedLetters.length > 0 && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <Library className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Saved Letters Library ({savedLetters.length})</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {savedLetters.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setCoverLetter(l.content);
                        setStyle(l.style || "startup");
                      }}
                      className="group cursor-pointer p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/55 dark:bg-neutral-900/30 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900 transition-all flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 capitalize">
                          {l.style || "startup"} Pitch
                        </div>
                        <div className="text-[9px] text-neutral-400 font-mono truncate">
                          {l.resume_name || "Resume"} - {l.jd_name || "Job"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(l.id, e)}
                        className="text-neutral-400 hover:text-rose-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Letter output */}
          <div className="lg:col-span-2 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-6 bg-neutral-50/50 dark:bg-neutral-950/25 min-h-[300px] flex flex-col justify-between">
            {coverLetter ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Generated Draft</span>
                  <div className="flex items-center gap-3">
                    {isSignedIn && (
                      <button
                        onClick={handleSave}
                        disabled={saveLoading}
                        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white font-medium disabled:opacity-50"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{saveLoading ? "Saving..." : "Save to Library"}</span>
                      </button>
                    )}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white font-medium"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied Letter</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3.5 h-3.5" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-mono max-h-[400px] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm">
                  {coverLetter}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2 h-full">
                <FileText className="w-8 h-8 opacity-40 animate-pulse" />
                <p className="text-xs">Your tailored cover letter will print here.</p>
              </div>
            )}

            <div className="text-[9px] text-neutral-400 mt-4 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <strong>Recruiting Insight:</strong> Modern companies appreciate concise cover letters that demonstrate exact cultural fit and direct alignment with job responsibilities.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
