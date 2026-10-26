import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import { 
  Sparkles, 
  FileText, 
  RefreshCw, 
  Search, 
  Copy, 
  Check, 
  UploadCloud, 
  Layers, 
  Award, 
  CheckCircle, 
  XCircle, 
  Briefcase, 
  ArrowRight,
  TrendingUp,
  FileCode,
  Sparkle,
  AlertCircle,
  FileDown
} from "lucide-react";

interface AIFeaturesProps {
  resumeText: string;
  setResumeText: (text: string) => void;
  resumeFilename: string;
  setResumeFilename: (name: string) => void;
  jdText: string;
  setJdText: (text: string) => void;
  jdFilename: string;
  setJdFilename: (name: string) => void;
}

type AISubTab = "generator" | "improver" | "ats" | "matching" | "keywords" | "tailoring";

export default function AIFeatures({
  resumeText,
  setResumeText,
  resumeFilename,
  setResumeFilename,
  jdText,
  setJdText,
  jdFilename,
  setJdFilename,
}: AIFeaturesProps) {
  const [activeSubTab, setActiveSubTab] = useState<AISubTab>("generator");
  
  // App-wide copy feedback
  const [copiedText, setCopiedText] = useState(false);

  // Feature 1: Generator states
  const [genPrompt, setGenPrompt] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState("");

  // Feature 2: Improver states
  const [improverResume, setImproverResume] = useState(resumeText || "");
  const [improverLoading, setImproverLoading] = useState(false);
  const [improverResult, setImproverResult] = useState("");
  const [improverChanges, setImproverChanges] = useState<string[]>([]);

  // Feature 3: ATS Score states
  const [atsResume, setAtsResume] = useState(resumeText || "");
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<{
    score: number;
    skills: number;
    projects: number;
    formatting: number;
    keywords: number;
    feedback: string[];
  } | null>(null);

  // Feature 4: JD Matching states
  const [matchResume, setMatchResume] = useState(resumeText || "");
  const [matchJd, setMatchJd] = useState(jdText || "");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    matchPercent: number;
    missingKeywords: string[];
    missingSkills: string[];
    suggestedEdits: { original: string; suggested: string }[];
  } | null>(null);

  // Feature 5: Keyword Generator states
  const [keywordRole, setKeywordRole] = useState("");
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordResult, setKeywordResult] = useState<string[]>([]);

  // Feature 6: Resume Tailoring states
  const [tailorResumeText, setTailorResumeText] = useState(resumeText || "");
  const [tailorJdText, setTailorJdText] = useState(jdText || "");
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorResult, setTailorResult] = useState("");
  const [tailorHighlights, setTailorHighlights] = useState<string[]>([]);

  // Keep inputs synced when core context updates
  useEffect(() => {
    if (resumeText) {
      setImproverResume(resumeText);
      setAtsResume(resumeText);
      setMatchResume(resumeText);
      setTailorResumeText(resumeText);
    }
  }, [resumeText]);

  useEffect(() => {
    if (jdText) {
      setMatchJd(jdText);
      setTailorJdText(jdText);
    }
  }, [jdText]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleApplyToWorkspace = (text: string, filename = "AI Generated Resume.txt") => {
    setResumeText(text);
    setResumeFilename(filename);
    alert("Applied successfully to your main workspace resume!");
  };

  const handleDownloadPDF = (title: string, text: string) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const marginX = 20;
      let posY = 20;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - (marginX * 2);

      const checkPageOverflow = (neededHeight: number) => {
        if (posY + neededHeight > pageHeight - 20) {
          doc.addPage();
          posY = 20;
        }
      };

      doc.setFont("Helvetica", "normal");
      const lines = text.split("\n");

      for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line) {
          posY += 4;
          continue;
        }

        if (line.startsWith("###")) {
          const cleanLine = line.replace(/^###\s*/, "");
          checkPageOverflow(8);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(50, 50, 50);
          doc.text(cleanLine, marginX, posY);
          posY += 6;
        } else if (line.startsWith("##")) {
          const cleanLine = line.replace(/^##\s*/, "");
          checkPageOverflow(12);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(30, 30, 30);
          doc.text(cleanLine, marginX, posY);
          posY += 2.5;
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.line(marginX, posY, pageWidth - marginX, posY);
          posY += 5.5;
        } else if (line.startsWith("#")) {
          const cleanLine = line.replace(/^#\s*/, "");
          checkPageOverflow(15);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text(cleanLine, marginX, posY);
          posY += 9;
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(70, 70, 70);

          let bulletOffset = 0;
          let bulletStr = "";
          if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•")) {
            bulletStr = "• ";
            line = line.replace(/^([-\*•])\s*/, "");
            bulletOffset = 4;
          }

          const wrappedLines = doc.splitTextToSize(line, maxLineWidth - bulletOffset);
          
          for (let i = 0; i < wrappedLines.length; i++) {
            checkPageOverflow(5);
            if (i === 0 && bulletStr) {
              doc.setFont("Helvetica", "bold");
              doc.setTextColor(100, 100, 100);
              doc.text(bulletStr, marginX, posY);
              doc.setFont("Helvetica", "normal");
              doc.setTextColor(70, 70, 70);
              doc.text(wrappedLines[i], marginX + bulletOffset, posY);
            } else {
              doc.text(wrappedLines[i], marginX + bulletOffset, posY);
            }
            posY += 4.5;
          }
        }
      }

      doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("PDF download failed", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // 1. AI Resume Generator API
  const handleGenerateResume = async () => {
    if (!genPrompt.trim()) return;
    setGenLoading(true);
    setGenResult("");
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt }),
      });
      const data = await res.json();
      if (data.resumeText) {
        setGenResult(data.resumeText);
      } else {
        alert(data.error || "Failed to generate resume");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenLoading(false);
    }
  };

  // 2. AI Resume Improver API
  const handleImproveResume = async () => {
    if (!improverResume.trim()) {
      alert("Please enter or import your current resume text first.");
      return;
    }
    setImproverLoading(true);
    setImproverResult("");
    setImproverChanges([]);
    try {
      const res = await fetch("/api/improve-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: improverResume }),
      });
      const data = await res.json();
      if (data.improvedText) {
        setImproverResult(data.improvedText);
        setImproverChanges(data.changesMade || []);
      } else {
        alert(data.error || "Failed to improve resume");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImproverLoading(false);
    }
  };

  // 3. ATS Score API
  const handleAnalyzeAtsScore = async () => {
    if (!atsResume.trim()) {
      alert("Please enter or import resume text first.");
      return;
    }
    setAtsLoading(true);
    setAtsResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: atsResume }),
      });
      const data = await res.json();
      if (data.score !== undefined) {
        setAtsResult({
          score: data.score,
          skills: data.breakdown?.skills || 80,
          projects: data.breakdown?.projects || 80,
          formatting: data.breakdown?.formatting || 80,
          keywords: data.breakdown?.keywords || 80,
          feedback: data.feedback || [],
        });
      } else {
        alert(data.error || "Failed to analyze ATS score");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAtsLoading(false);
    }
  };

  // 4. Job Description Matching API
  const handleJdMatching = async () => {
    if (!matchResume.trim()) {
      alert("Please provide your resume text.");
      return;
    }
    if (!matchJd.trim()) {
      alert("Please paste a target Job Description to compare.");
      return;
    }
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: matchResume, jobDescriptionText: matchJd }),
      });
      const data = await res.json();
      if (data.score !== undefined) {
        // Extract missing keywords, missing skills, and suggested edits
        const missingKeywords = (data.keywords || [])
          .filter((k: any) => !k.found)
          .map((k: any) => k.keyword);

        setMatchResult({
          matchPercent: data.score,
          missingKeywords: missingKeywords.slice(0, 10),
          missingSkills: data.skillsGap?.need || [],
          suggestedEdits: data.projectSuggestions || [],
        });
      } else {
        alert(data.error || "Failed to match JD");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatchLoading(false);
    }
  };

  // 5. Keyword Generator API
  const handleKeywordGenerator = async () => {
    if (!keywordRole.trim()) return;
    setKeywordLoading(true);
    setKeywordResult([]);
    try {
      const res = await fetch("/api/generate-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole: keywordRole }),
      });
      const data = await res.json();
      if (data.keywords) {
        setKeywordResult(data.keywords);
      } else {
        alert(data.error || "Failed to generate keywords");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKeywordLoading(false);
    }
  };

  // 6. Resume Tailoring API
  const handleResumeTailoring = async () => {
    if (!tailorResumeText.trim()) {
      alert("Please enter or import your current resume text first.");
      return;
    }
    if (!tailorJdText.trim()) {
      alert("Please paste a target Job Description to align with.");
      return;
    }
    setTailorLoading(true);
    setTailorResult("");
    setTailorHighlights([]);
    try {
      const res = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: tailorResumeText, jobDescription: tailorJdText }),
      });
      const data = await res.json();
      if (data.tailorText || data.tailoredText) {
        setTailorResult(data.tailoredText || data.tailorText);
        setTailorHighlights(data.highlights || []);
      } else {
        alert(data.error || "Failed to tailor resume");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTailorLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 space-y-3">
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-neutral-900 to-neutral-800 dark:from-white dark:to-neutral-100 text-white dark:text-neutral-950 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 dark:text-purple-600">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Copilot</span>
          </div>
          <h3 className="font-display text-base font-extrabold tracking-tight">Intelligence Suite</h3>
          <p className="text-[10px] text-neutral-300 dark:text-neutral-500 leading-normal">
            Harness Google Gemini 3.5 models to audit, enrich, and optimize every detail of your career documents.
          </p>
        </div>

        <div className="flex flex-col gap-1 p-1.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-neutral-100 dark:border-neutral-900 shadow-xs">
          {[
            { id: "generator", label: "Resume Generator", desc: "Build standard templates" },
            { id: "improver", label: "Resume Improver", desc: "Polish phrasing & style" },
            { id: "ats", label: "ATS Scorecard", desc: "Real score audit breakdowns" },
            { id: "matching", label: "JD Matching", desc: "Map keyword alignment" },
            { id: "keywords", label: "Keyword Builder", desc: "Identify industry jargon" },
            { id: "tailoring", label: "Tailored Optimizer", desc: "Match role specifics" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as AISubTab)}
              className={`flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all ${
                activeSubTab === item.id
                  ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40"
              }`}
            >
              <span className="text-xs font-bold">{item.label}</span>
              <span className={`text-[10px] ${activeSubTab === item.id ? "text-neutral-300 dark:text-neutral-500" : "text-neutral-400"}`}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Feature Workplace Container */}
      <div className="lg:col-span-9 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 rounded-2xl p-6 shadow-xs min-h-[500px] flex flex-col justify-between">
        
        {/* Dynamic Tool Content Render */}
        <div className="space-y-6">
          {activeSubTab === "generator" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                  <span>AI Resume Generator</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Input a short career summary, academic baseline, or area of focus. Gemini writes a highly structure recruiter-ready template.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Candidate Background & Preferences</label>
                  <textarea
                    rows={4}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Describe your career goals and background in any field (e.g. 'BSN Registered Nurse with 5 years in Emergency Care and patient triage seeking a Charge Nurse role' or 'Senior Financial Analyst with M&A valuation and GAAP accounting experience')..."
                    className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-sans"
                  />
                </div>

                <button
                  onClick={handleGenerateResume}
                  disabled={genLoading || !genPrompt.trim()}
                  className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
                >
                  {genLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Resume</span>
                </button>
              </div>

              {genResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">AI Created Resume Template</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(genResult)}
                        className="p-1.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPDF("Generated_Resume", genResult)}
                        className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        onClick={() => handleApplyToWorkspace(genResult, "Generated Resume.txt")}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Apply to Workspace</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-neutral-100 dark:border-neutral-800 whitespace-pre-wrap max-h-[380px]">
                    {genResult}
                  </pre>
                </motion.div>
              )}
            </div>
          )}

          {activeSubTab === "improver" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Sparkle className="w-4 h-4 text-emerald-500" />
                  <span>AI Resume Improver</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Analyze your existing resume and generate a modernized, metrics-oriented upgrade with better formatting, spelling, and corporate wording in one click.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Current Resume Text</label>
                    <button
                      onClick={() => setImproverResume(resumeText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Active Workspace
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={improverResume}
                    onChange={(e) => setImproverResume(e.target.value)}
                    placeholder="Paste your resume contents..."
                    className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleImproveResume}
                disabled={improverLoading || !improverResume.trim()}
                className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
              >
                {improverLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>Polish & Improve Resume</span>
              </button>

              {improverResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-bold uppercase text-neutral-400">Optimization Feedback Highlights</h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 font-sans">
                      {improverChanges.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Polished Plain Text Resume</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(improverResult)}
                        className="p-1.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPDF("Improved_Resume", improverResult)}
                        className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        onClick={() => handleApplyToWorkspace(improverResult, "Improved Resume.txt")}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Apply to Workspace</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-neutral-100 dark:border-neutral-800 whitespace-pre-wrap max-h-[300px]">
                    {improverResult}
                  </pre>
                </motion.div>
              )}
            </div>
          )}

          {activeSubTab === "ats" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span>ATS Score Audit</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Analyze keyword density, proper layout sections, overall formatting, and structured readability to generate an authentic recruiter score.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Analyze Text</label>
                    <button
                      onClick={() => setAtsResume(resumeText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Active Workspace
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={atsResume}
                    onChange={(e) => setAtsResume(e.target.value)}
                    placeholder="Paste resume contents for scoring..."
                    className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-mono"
                  />
                </div>

                <button
                  onClick={handleAnalyzeAtsScore}
                  disabled={atsLoading || !atsResume.trim()}
                  className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
                >
                  {atsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Calculate ATS Score</span>
                </button>
              </div>

              {atsResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-neutral-50 dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-900">
                    {/* Circle Score Gauge */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center space-y-1">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className="stroke-neutral-200 dark:stroke-neutral-800 fill-none"
                            strokeWidth="8"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className="stroke-purple-600 dark:stroke-purple-400 fill-none transition-all duration-500"
                            strokeWidth="8"
                            strokeDasharray={263.89}
                            strokeDashoffset={263.89 - (263.89 * atsResult.score) / 100}
                          />
                        </svg>
                        <div className="absolute font-display text-2xl font-black text-neutral-900 dark:text-white">
                          {atsResult.score}%
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-neutral-400 mt-2">Overall ATS Score</span>
                    </div>

                    {/* Breakdown Scores */}
                    <div className="md:col-span-8 space-y-3">
                      <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Metric Breakdown</span>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Skills Match", val: atsResult.skills, color: "bg-purple-600" },
                          { label: "Projects Quality", val: atsResult.projects, color: "bg-emerald-600" },
                          { label: "Formatting Align", val: atsResult.formatting, color: "bg-blue-600" },
                          { label: "Keyword Density", val: atsResult.keywords, color: "bg-amber-600" }
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">{item.label}</span>
                              <span className="font-bold font-mono text-neutral-900 dark:text-white">{item.val}</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Critical Audited Feedback</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-700 dark:text-neutral-400">
                      {atsResult.feedback.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeSubTab === "matching" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Job Description Matching</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Compare your current resume draft with a live target job description (JD). Identify missing keywords, skills gap list, and suggested experience rewrites.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Your Resume</label>
                    <button
                      onClick={() => setMatchResume(resumeText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Workspace
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={matchResume}
                    onChange={(e) => setMatchResume(e.target.value)}
                    placeholder="Paste resume contents..."
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Target Job Description (JD)</label>
                    <button
                      onClick={() => setMatchJd(jdText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Workspace
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={matchJd}
                    onChange={(e) => setMatchJd(e.target.value)}
                    placeholder="Paste target job description to match keywords and skills..."
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-sans"
                  />
                </div>
              </div>

              <button
                onClick={handleJdMatching}
                disabled={matchLoading || !matchResume.trim() || !matchJd.trim()}
                className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
              >
                {matchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                <span>Analyze Alignment Matching</span>
              </button>

              {matchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  {/* Score */}
                  <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-100 dark:border-neutral-900">
                    <span className="font-display text-4xl font-black text-neutral-950 dark:text-white">{matchResult.matchPercent}%</span>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">JD Match Rating</span>
                      <p className="text-xs text-neutral-500">Your resume matching score against targeted skills and keywords.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Missing Keywords */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Missing Jargon Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.missingKeywords.length > 0 ? (
                          matchResult.missingKeywords.map((kw, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-red-500/10 dark:bg-red-500/5 text-red-600 dark:text-red-400 border border-red-500/15 text-[10px] font-bold">
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-400">All key ATS keywords match perfectly!</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">Missing Core Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.missingSkills.length > 0 ? (
                          matchResult.missingSkills.map((sk, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/15 text-[10px] font-bold">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-400">Core technology stack alignment is flawless!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Suggested Edits */}
                  {matchResult.suggestedEdits.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Suggested Project & Bullet Re-Engineering</span>
                      <div className="space-y-3.5">
                        {matchResult.suggestedEdits.map((item, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-red-400">Original Resume phrase</span>
                              <p className="text-[11px] text-neutral-500 leading-relaxed italic">"{item.original}"</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-emerald-400">Tailored Recruiter-Friendly Suggestion</span>
                              <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-semibold">"{item.suggested}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeSubTab === "keywords" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Search className="w-4 h-4 text-purple-500" />
                  <span>AI Keyword Generator</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Enter your target career path or job title. Gemini recommends specific industry-standard technology terms and framework descriptions.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Target Role / Designation</label>
                  <input
                    type="text"
                    value={keywordRole}
                    onChange={(e) => setKeywordRole(e.target.value)}
                    placeholder="e.g. Frontend Developer"
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200"
                  />
                </div>

                <button
                  onClick={handleKeywordGenerator}
                  disabled={keywordLoading || !keywordRole.trim()}
                  className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
                >
                  {keywordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Recommended Keywords</span>
                </button>
              </div>

              {keywordResult.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3.5 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Top Recommended Industry Keywords</span>
                  <div className="flex flex-wrap gap-2">
                    {keywordResult.map((kw, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCopy(kw)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 hover:border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
                      >
                        <span>{kw}</span>
                        <Copy className="w-3 h-3 text-neutral-400" />
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-neutral-400 italic block mt-1">Tip: Click on any keyword tag above to copy it instantly. Integrate them naturally into skills, summaries, or descriptions.</span>
                </motion.div>
              )}
            </div>
          )}

          {activeSubTab === "tailoring" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-neutral-950 dark:text-white">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>AI Resume Tailoring</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Upload a job description and click once. Gemini reformulates and re-indexes your resume structure specifically for that particular career role.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Your Source Resume</label>
                    <button
                      onClick={() => setTailorResumeText(resumeText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Active Workspace
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={tailorResumeText}
                    onChange={(e) => setTailorResumeText(e.target.value)}
                    placeholder="Paste resume contents..."
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Target Job Description (JD)</label>
                    <button
                      onClick={() => setTailorJdText(jdText)}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                    >
                      Pull from Active Workspace
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={tailorJdText}
                    onChange={(e) => setTailorJdText(e.target.value)}
                    placeholder="Paste target job description to customize resume specifically for..."
                    className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white placeholder:text-neutral-400 dark:text-neutral-200 resize-none font-sans"
                  />
                </div>
              </div>

              <button
                onClick={handleResumeTailoring}
                disabled={tailorLoading || !tailorResumeText.trim() || !tailorJdText.trim()}
                className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-2"
              >
                {tailorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                <span>Tailor My Resume Now</span>
              </button>

              {tailorResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-6"
                >
                  {/* Highlights of optimizations */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-bold uppercase text-neutral-400">Tailoring Optimization Summaries</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 font-sans">
                      {tailorHighlights.map((hl, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">Custom Tailored Resume Result</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(tailorResult)}
                        className="p-1.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPDF("Tailored_Resume", tailorResult)}
                        className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        onClick={() => handleApplyToWorkspace(tailorResult, "Tailored Resume.txt")}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 transition-colors text-[10px] font-bold flex items-center gap-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Apply to Workspace</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-neutral-100 dark:border-neutral-800 whitespace-pre-wrap max-h-[300px]">
                    {tailorResult}
                  </pre>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Global workspace context card */}
        <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400 dark:text-neutral-500 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span>Active workspace document: <strong>{resumeFilename || "None loaded"}</strong></span>
          </div>
          <p className="italic">Protip: You can apply generated results to save changes directly into your Workspace.</p>
        </div>
      </div>
    </div>
  );
}
