import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  FileText,
  RefreshCw,
  AlertCircle,
  Download,
  Trash2,
  History,
  BookOpen,
  Briefcase,
  Award,
  Layers,
  Moon,
  Sun,
  Github,
  Linkedin,
  Twitter,
  Mail,
  CheckCircle,
  TrendingUp,
  ExternalLink,
  LogIn,
  UploadCloud
} from "lucide-react";

// Components
import ResumeUploader from "./components/ResumeUploader";
import JobDescriptionInput from "./components/JobDescriptionInput";
import AnalysisDashboard from "./components/AnalysisDashboard";
import CoverLetterGenerator from "./components/CoverLetterGenerator";
import ResumeCompare from "./components/ResumeCompare";
import AIFeatures from "./components/AIFeatures";
import { extractTextFromPdf } from "./utils/pdfParser";

// Types
import { ResumeAnalysis, HistoryItem } from "./types";

// Clerk Auth Custom Components
import { ClerkAuthWrapper, SignedIn, SignedOut, SignInButton, UserButton, useUser } from "./components/ClerkAuth";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cvpilot_theme");
      if (stored) return stored === "dark";
      // Optional check for system preference
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("cvpilot_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("cvpilot_theme", "light");
    }
  }, [darkMode]);

  return (
    <ClerkAuthWrapper darkMode={darkMode}>
      <AppContent darkMode={darkMode} setDarkMode={setDarkMode} />
    </ClerkAuthWrapper>
  );
}

function AppContent({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (d: boolean) => void }) {
  const { isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState<"dashboard" | "compare" | "ai-features" | "cover-letter" | "history">("dashboard");

  // States for database identifiers
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jdId, setJdId] = useState<string | null>(null);

  // States for main analyzer inputs
  const [resumeText, setResumeText] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdFilename, setJdFilename] = useState("");

  // States for analysis results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysis | null>(null);

  // States for persistent history logs
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Ref for direct file upload from analysis screen
  const directUploadRef = useRef<HTMLInputElement>(null);

  const handleDirectUploadResume = async (file: File) => {
    try {
      setError(null);
      setLoading(true);
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("No text content could be extracted from this file.");
      }

      setResumeText(text);
      setResumeFilename(file.name);
      setAnalysisResult(null); // Clear previous analysis
      setResumeId(null); // Reset resumeId for new upload
    } catch (err: any) {
      setError(err.message || "Failed to upload and parse the resume.");
    } finally {
      setLoading(false);
    }
  };

  // Load and sync user data from DB on load/sign-in
  useEffect(() => {
    if (isSignedIn && user) {
      const syncAndLoad = async () => {
        try {
          // 1. Sync user profile
          await fetch("/api/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
          });

          // 2. Fetch history
          const historyRes = await fetch("/api/history", {
            headers: { "x-user-id": user.id }
          });
          if (historyRes.ok) {
            const histData = await historyRes.json();
            setHistoryList(histData);
          }

          // 3. Fetch latest resume
          const resumeRes = await fetch("/api/resumes", {
            headers: { "x-user-id": user.id }
          });
          if (resumeRes.ok) {
            const resumes = await resumeRes.json();
            if (resumes.length > 0) {
              setResumeId(resumes[0].id);
              setResumeText(resumes[0].content);
              setResumeFilename(resumes[0].filename);
            }
          }

          // 4. Fetch latest job description
          const jdRes = await fetch("/api/job-descriptions", {
            headers: { "x-user-id": user.id }
          });
          if (jdRes.ok) {
            const jds = await jdRes.json();
            if (jds.length > 0) {
              setJdId(jds[0].id);
              setJdText(jds[0].content);
              setJdFilename(jds[0].title);
            }
          }
        } catch (err) {
          console.error("Error loading user data from database:", err);
        }
      };

      syncAndLoad();
    } else {
      // Fallback: load history from localStorage if signed out
      const stored = localStorage.getItem("cvpilot_history");
      if (stored) {
        try {
          setHistoryList(JSON.parse(stored));
        } catch (err) {
          console.error("Failed to parse local history:", err);
        }
      }
    }
  }, [isSignedIn, user]);

  // Save history helper
  const saveToHistory = async (analysis: ResumeAnalysis, rText: string, rName: string, jText: string, jName: string) => {
    if (isSignedIn && user) {
      try {
        // Save or update resume
        const resumeRes = await fetch("/api/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id
          },
          body: JSON.stringify({
            filename: rName || "Uploaded Resume",
            content: rText,
            score: analysis.score,
            resumeId: resumeId
          })
        });
        const savedResume = await resumeRes.json();
        setResumeId(savedResume.id);

        // Save or update Job Description if present
        let savedJdId = null;
        if (jText.trim()) {
          const jdRes = await fetch("/api/job-descriptions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id
            },
            body: JSON.stringify({
              title: jName || "Job Description",
              content: jText,
              jobDescriptionId: jdId
            })
          });
          const savedJd = await jdRes.json();
          savedJdId = savedJd.id;
          setJdId(savedJdId);
        }

        // Save analysis history entry
        await fetch("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id
          },
          body: JSON.stringify({
            resumeId: savedResume.id,
            jobDescriptionId: savedJdId,
            score: analysis.score,
            breakdown: analysis.breakdown,
            keywords: analysis.keywords,
            skillsGap: analysis.skillsGap,
            feedback: analysis.feedback,
            projectSuggestions: analysis.projectSuggestions,
            achievements: analysis.achievements,
            interviewQuestions: analysis.interviewQuestions,
            portfolioSuggestions: analysis.portfolioSuggestions
          })
        });

        // Refresh history list
        const refreshedHist = await fetch("/api/history", {
          headers: { "x-user-id": user.id }
        });
        if (refreshedHist.ok) {
          const updatedList = await refreshedHist.json();
          setHistoryList(updatedList);
        }
      } catch (err) {
        console.error("Failed to save data to database:", err);
      }
    } else {
      // LocalStorage fallback for sandbox
      const newItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        resumeName: rName || "Uploaded Resume",
        resumeText: rText,
        jdName: jName || "Standard Analysis",
        jdText: jText,
        score: analysis.score,
        analysis: analysis,
      };
      const updated = [newItem, ...historyList].slice(0, 20); // Keep last 20 items
      setHistoryList(updated);
      localStorage.setItem("cvpilot_history", JSON.stringify(updated));
    }
  };

  const deleteHistoryItem = async (id: string, e: any) => {
    e.stopPropagation();
    if (isSignedIn && user) {
      try {
        await fetch(`/api/history/${id}`, {
          method: "DELETE",
          headers: { "x-user-id": user.id }
        });
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Failed to delete history item:", err);
      }
    } else {
      const updated = historyList.filter((item) => item.id !== id);
      setHistoryList(updated);
      localStorage.setItem("cvpilot_history", JSON.stringify(updated));
    }
  };

  const loadHistoryItem = (item: any) => {
    if (item.resumeId && isSignedIn && user) {
      // Set IDs
      setResumeId(item.resumeId);
      if (item.jdId) setJdId(item.jdId);

      // Hydrate contents asynchronously
      fetch(`/api/resumes/${item.resumeId}`, {
        headers: { "x-user-id": user.id }
      })
      .then(res => res.json())
      .then(resumeData => {
        const version = resumeData.versions?.find((v: any) => v.id === item.resumeVersionId) || resumeData.versions?.[0];
        setResumeText(version?.content || resumeData.content || "");
        setResumeFilename(resumeData.filename);
      })
      .catch(err => console.error("Error loading resume details for history:", err));

      if (item.jdId) {
        fetch("/api/job-descriptions", {
          headers: { "x-user-id": user.id }
        })
        .then(res => res.json())
        .then(jds => {
          const jd = jds.find((j: any) => j.id === item.jdId);
          if (jd) {
            setJdText(jd.content);
            setJdFilename(jd.title);
          }
        })
        .catch(err => console.error("Error loading JD details for history:", err));
      } else {
        setJdText("");
        setJdFilename("");
      }
    } else {
      // LocalStorage fallback loading
      setResumeText(item.resumeText);
      setResumeFilename(item.resumeName);
      setJdText(item.jdText);
      setJdFilename(item.jdName);
    }
    setAnalysisResult(item.analysis);
    setActiveTab("dashboard");
  };

  const handleRunAnalysis = async () => {
    if (!resumeText.trim()) {
      setError("Please provide a resume text by uploading a file or pasting it directly.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText,
          jobDescriptionText: jdText,
        }),
      });

      const data = await response.json();

      if (response.ok && data.score !== undefined) {
        setAnalysisResult(data);
        await saveToHistory(data, resumeText, resumeFilename, jdText, jdFilename);
      } else {
        setError(data.error || "An unexpected error occurred during resume analysis.");
      }
    } catch (err: any) {
      setError("Failed to connect to the analysis engine. Check your network or server logs.");
    } finally {
      setLoading(false);
    }
  };

  const resetAnalyzer = () => {
    setResumeText("");
    setResumeFilename("");
    setJdText("");
    setJdFilename("");
    setAnalysisResult(null);
    setError(null);
    setResumeId(null);
    setJdId(null);
  };

  // Feature 3: Download formatted report
  const handleDownloadReport = () => {
    if (!analysisResult) return;

    const sections = [
      `=========================================`,
      `       RESUMES & CV PILOT ATS ANALYSIS REPORT     `,
      `=========================================`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Resume File: ${resumeFilename || "Untitled Resume"}`,
      `Target Job Profile: ${jdFilename ? jdFilename : "General Market Assessment"}`,
      `\nOVERALL ATS SCORE: ${analysisResult.score}%`,
      `\n-----------------------------------------`,
      `SECTION RATINGS:`,
      `- Skills Match: ${analysisResult.breakdown.skills}%`,
      `- Projects Quality: ${analysisResult.breakdown.projects}%`,
      `- Experience Depth: ${analysisResult.breakdown.experience}%`,
      `- Keyword Alignment: ${analysisResult.breakdown.keywords}%`,
      `- Layout / Formatting: ${analysisResult.breakdown.formatting}%`,
      `\n-----------------------------------------`,
      `CRITICAL AI SUGGESTIONS:`,
      ...analysisResult.feedback.map((item, idx) => `${idx + 1}. [ ] ${item}`),
      `\n-----------------------------------------`,
      `SKILL GAP OVERVIEW:`,
      `* MATCHED SKILLS: ${analysisResult.skillsGap.have.join(", ")}`,
      `* MISSING KEYWORDS / RECOMMENDATIONS: ${analysisResult.skillsGap.need.join(", ")}`,
      `\n-----------------------------------------`,
      `MOCKED INTERVIEW QUESTIONS PREP:`,
      `\n[HR / Behavioral Questions]`,
      ...analysisResult.interviewQuestions.hr.map((q) => `- ${q}`),
      `\n[Technical Depth Questions]`,
      ...analysisResult.interviewQuestions.technical.map((q) => `- ${q}`),
      `\n[Project Architecture Questions]`,
      ...analysisResult.interviewQuestions.project.map((q) => `- ${q}`),
      `\n-----------------------------------------`,
      `Generated by CVPilot - Your AI Career Copilot.`,
      `=========================================`,
    ];

    const content = sections.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CVPilot_ATS_Report_${resumeFilename.replace(/\s+/g, "_") || "CV"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
        
        {/* Premium Header */}
        <header className="border-b border-neutral-100 dark:border-neutral-900 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-950 dark:bg-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white dark:text-neutral-950" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-700 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                CVPilot
              </span>
              <div className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold leading-none">
                AI Career Copilot
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <SignedIn>
            <nav className="hidden md:flex items-center gap-1 bg-neutral-100/60 dark:bg-neutral-900/60 p-1 rounded-xl text-xs font-medium border border-neutral-200/20">
              {[
                { id: "dashboard", label: "Dashboard", icon: Briefcase },
                { id: "compare", label: "Resume A/B", icon: Layers },
                { id: "ai-features", label: " AI Features", icon: Sparkles },
                { id: "cover-letter", label: "Cover Letter", icon: BookOpen },
                { id: "history", label: "History Log", icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </SignedIn>

          {/* Extra utilities (Theme, GitHub, profile mock) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-lg transition-colors border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900 shadow-xs"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-neutral-500" />}
            </button>
            <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-3">
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton />
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tab menu */}
      <SignedIn>
        <div className="md:hidden flex border-b border-neutral-200/50 dark:border-neutral-900 bg-white dark:bg-neutral-950 px-2 py-1.5 gap-1 scrollbar-none overflow-x-auto">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "compare", label: "A/B Compare" },
            { id: "ai-features", label: " AI Features" },
            { id: "cover-letter", label: "Cover Letter" },
            { id: "history", label: "History Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                activeTab === tab.id
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SignedIn>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SignedIn>
          <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {!analysisResult ? (
                /* Empty Upload Form */
                <div className="space-y-8">
                  {/* Hero Intro */}
                  <div className="text-center space-y-3 max-w-2xl mx-auto py-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full border border-neutral-200/30">
                      Now Powered by Gemini 3.5
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                      Optimize your resume to defeat applicant tracking filters.
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Upload your PDF/TXT resume and targeted job descriptions. Get high-fidelity keyword mapping, section scores, mock interview questions, and instant rewritten bullets.
                    </p>
                  </div>

                  {/* Input Split Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ResumeUploader
                      onTextExtracted={(text, filename) => {
                        setResumeText(text);
                        setResumeFilename(filename);
                      }}
                      extractedFilename={resumeFilename}
                      initialText={resumeText}
                    />

                    <JobDescriptionInput
                      onTextExtracted={(text, filename) => {
                        setJdText(text);
                        setJdFilename(filename);
                      }}
                      extractedFilename={jdFilename}
                      initialText={jdText}
                    />
                  </div>

                  {/* Actions & Errors */}
                  {error && (
                    <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs max-w-md mx-auto">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={handleRunAnalysis}
                      disabled={loading || !resumeText.trim()}
                      className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-10 py-3.5 rounded-xl text-xs font-bold shadow-md shadow-neutral-950/10 dark:shadow-none transition-colors flex items-center gap-2.5 hover:scale-[1.01]"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Analyzing Credentials & Keywords...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Analyze Resume IQ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mini Bento feature promo cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-neutral-100 dark:border-neutral-900">
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-xs font-bold">Defeat ATS Obstacles</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Ensure proper keyword densities and sections that screening engines parse perfectly.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-2">
                      <Award className="w-5 h-5 text-purple-500" />
                      <h4 className="text-xs font-bold">Formulate STAR Success</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Transform basic responsibilities into numbers-oriented achievements.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <h4 className="text-xs font-bold">Predict Interview Topics</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Mock HR and technical questions pre-formulated specifically around your actual uploaded text.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Filled Active Dashboard */
                <div className="space-y-6">
                  {/* Dashboard header actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-900 p-4 rounded-2xl backdrop-blur-md">
                    <div>
                      <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        Analysis Complete for: <span className="font-mono text-neutral-500">{resumeFilename}</span>
                      </h2>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Compared to: {jdFilename || "General Industry Trajectory"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={directUploadRef}
                        type="file"
                        accept=".pdf,.txt"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleDirectUploadResume(e.target.files[0])}
                      />

                      <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium transition-colors border border-neutral-200/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ATS Report</span>
                      </button>

                      <button
                        onClick={() => directUploadRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium transition-colors border border-neutral-200/10"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-purple-500" />
                        <span>Upload Other Resume</span>
                      </button>

                      <button
                        onClick={resetAnalyzer}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <span>Analyze New</span>
                      </button>
                    </div>
                  </div>

                  <AnalysisDashboard analysis={analysisResult} jobDescription={jdText} />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "compare" && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResumeCompare />
            </motion.div>
          )}

          {activeTab === "ai-features" && (
            <motion.div
              key="ai-features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AIFeatures
                resumeText={resumeText}
                setResumeText={setResumeText}
                resumeFilename={resumeFilename}
                setResumeFilename={setResumeFilename}
                jdText={jdText}
                setJdText={setJdText}
                jdFilename={jdFilename}
                setJdFilename={setJdFilename}
              />
            </motion.div>
          )}

          {activeTab === "cover-letter" && (
            <motion.div
              key="cover-letter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CoverLetterGenerator 
                resumeText={resumeText} 
                jobDescriptionText={jdText} 
                resumeId={resumeId}
                jdId={jdId}
              />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-500" />
                  <span>CVPilot History Log</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Access previously evaluated resume profiles to monitor improvements and recall specific feedback lists.
                </p>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-20 text-neutral-400 text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                  <History className="w-8 h-8 opacity-30 animate-pulse" />
                  <p>No evaluations have been logged yet. Get started on the Dashboard!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="group cursor-pointer border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl relative shadow-xs transition-all flex flex-col justify-between hover:scale-[1.01]"
                    >
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center">
                            {item.score}%
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[160px]">
                              {item.resumeName}
                            </h4>
                            <span className="text-[10px] text-neutral-400 font-mono">{item.date}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-neutral-400">
                          <strong>Compared against:</strong> {item.jdName || "General Profile"}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between text-[10px] text-neutral-400">
                        <span>Click to load profile</span>
                        <ExternalLink className="w-3 h-3 text-neutral-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SignedIn>

      <SignedOut>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto py-12 space-y-12"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/40 text-neutral-500 dark:text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              <span>AI Career Copilot Suite</span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]">
              The Intelligent ATS Optimizer & Career Copilot.
            </h1>
            
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Unlock your application's absolute best scores. Paste resumes, analyze target descriptions, generate cover letters, and prepare custom behavioral interview prompts.
            </p>

            <div className="pt-4">
              <SignInButton>
                <button className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 px-8 py-3.5 rounded-xl text-xs font-bold shadow-md shadow-neutral-950/10 dark:shadow-none transition-all duration-200 inline-flex items-center gap-2 hover:scale-[1.01]">
                  <LogIn className="w-4 h-4" />
                  <span>Get Started & Sign In</span>
                </button>
              </SignInButton>
            </div>
          </div>

          {/* Value Propositions Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/5 flex items-center justify-center text-purple-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold">ATS Obstacle Grading</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Map matching keyword densities, score alignment rating percentages, and formatting parses before submitting resumes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold"> AI Features Suite</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Generate tailored templates, polish wording, match job descriptions, and extract key ATS phrases instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 flex items-center justify-center text-blue-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold">AI Interview Simulator</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Staggered behavior questions generated dynamically based on your uploaded history, target skills, and backgrounds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 flex items-center justify-center text-amber-500">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold">Side-By-Side Resume A/B</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Compare multiple variations of your draft, measuring structural differences and matching metrics side-by-side.
              </p>
            </div>
          </div>
        </motion.div>
      </SignedOut>
    </main>

    {/* Styled Footer */}
    <footer className="border-t border-neutral-100 dark:border-neutral-900 mt-16 bg-white dark:bg-neutral-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand details */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-950 dark:bg-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white dark:text-neutral-950" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                CVPilot
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              Build ATS-friendly resumes with AI, optimize for any job, and land interviews faster.
            </p>
            
            {/* Socials */}
            <div className="flex items-center gap-3.5 pt-1 text-neutral-400">
              <a href="https://github.com/dhushyandh" className="hover:text-neutral-900 dark:hover:text-white transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/dhushyandh" className="hover:text-neutral-900 dark:hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="mailto:dhushyandhneduncheziyan4896@gmail.com" className="hover:text-neutral-900 dark:hover:text-white transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-900 dark:text-neutral-200">
              Product
            </h5>
            <ul className="space-y-2 text-[11px] text-neutral-400 font-medium">
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Resume Builder</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">ATS Analyzer</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Job Match</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Cover Letters</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Interview Prep</span></li>
            </ul>
          </div>

          {/* Resources links */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-900 dark:text-neutral-200">
              Resources
            </h5>
            <ul className="space-y-2 text-[11px] text-neutral-400 font-medium">
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Documentation</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Blog</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Changelog</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">FAQs</span></li>
            </ul>
          </div>

          {/* Company links */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-900 dark:text-neutral-200">
              Company
            </h5>
            <ul className="space-y-2 text-[11px] text-neutral-400 font-medium">
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">About</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Contact</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Privacy</span></li>
              <li><span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">Terms</span></li>
            </ul>
          </div>

        </div>

        {/* Bottom divider and copyright */}
        <div className="border-t border-neutral-100 dark:border-neutral-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <div>
            &copy; 2026 CVPilot. Created by Dhushyandh.
          </div>
          <div className="flex gap-4">
            <span className="hover:text-neutral-600 transition-colors cursor-pointer">Security Protocol</span>
            <span className="hover:text-neutral-600 transition-colors cursor-pointer">ATS Compliance Guide</span>
            <span className="hover:text-neutral-600 transition-colors cursor-pointer">Mock Interview Rules</span>
          </div>
        </div>

      </div>
    </footer>
  </div>
  );
}
