import { useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clipboard,
  Check,
  HelpCircle,
  Code,
  BookOpen,
  Briefcase,
  Layers,
  Award,
  Terminal,
  RefreshCw
} from "lucide-react";
import { ResumeAnalysis } from "../types";
import MetricCard from "./MetricCard";

interface AnalysisDashboardProps {
  analysis: ResumeAnalysis;
  jobDescription?: string;
}

export default function AnalysisDashboard({ analysis, jobDescription }: AnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "rewrite" | "questions">("overview");
  
  // Custom interactive rewriter state
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteType, setRewriteType] = useState("summary");
  const [rewrittenOutput, setRewrittenOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = (text: string, indexId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(indexId);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRewrite = async () => {
    if (!rewriteText.trim()) return;
    setRewriting(true);
    setRewrittenOutput("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rewriteText,
          type: rewriteType,
          jobDescription: jobDescription,
        }),
      });
      const data = await res.json();
      if (data.rewrittenText) {
        setRewrittenOutput(data.rewrittenText);
      } else {
        setRewrittenOutput(data.error || "Failed to rewrite. Try again.");
      }
    } catch (err) {
      setRewrittenOutput("Error connecting to rewrite service.");
    } finally {
      setRewriting(false);
    }
  };

  const triggerPresetRewrite = (text: string, type: string) => {
    setRewriteText(text);
    setRewriteType(type);
    setActiveTab("rewrite");
    // Automatically trigger if text is selected
    setTimeout(() => {
      const button = document.getElementById("trigger-rewrite-btn");
      if (button) button.click();
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Metric Visual Card */}
      <MetricCard score={analysis.score} breakdown={analysis.breakdown} />

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 dark:border-neutral-800 scrollbar-none overflow-x-auto gap-4">
        {[
          { id: "overview", label: "Analysis & Gaps", icon: Layers },
          { id: "keywords", label: "Keywords & Skills", icon: Terminal },
          { id: "rewrite", label: "One-Click Rewriter", icon: Sparkles },
          { id: "questions", label: "Interview Prep", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                  : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Critical Feedback */}
            <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>AI Action Items</span>
              </h3>
              <ul className="space-y-3">
                {analysis.feedback.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Project suggested revisions */}
            <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Project Bullet Enhancer</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Weak descriptions are parsed into high-performing bullets following the STAR formula.
              </p>
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {analysis.projectSuggestions.map((proj, idx) => (
                  <div key={idx} className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Original</span>
                      <p className="text-xs text-neutral-500 line-through italic">{proj.original}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Recruiter Recommended</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => triggerPresetRewrite(proj.original, "project")}
                            className="text-[10px] text-neutral-950 dark:text-white font-medium hover:underline flex items-center gap-0.5"
                          >
                            <RefreshCw className="w-2.5 h-2.5 animate-pulse" />
                            Rewrite Context
                          </button>
                          <button
                            onClick={() => copyToClipboard(proj.suggested, `proj-${idx}`)}
                            className="text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                          >
                            {copiedIndex === `proj-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{proj.suggested}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Builder Suggestions */}
            <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span>Achievement Templates</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Industry-aligned metrics and quantified outcome templates tailored to your career trajectory.
              </p>
              <div className="space-y-3">
                {analysis.achievements.map((ach, idx) => (
                  <div key={idx} className="flex gap-2 p-3 bg-neutral-50 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-800 rounded-xl relative group">
                    <span className="text-purple-500 mt-1">✦</span>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 pr-6">{ach}</p>
                    <button
                      onClick={() => copyToClipboard(ach, `ach-${idx}`)}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-950 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedIndex === `ach-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio and Presence Suggestions */}
            <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Portfolio suggestions</span>
              </h3>
              <div className="space-y-3">
                {analysis.portfolioSuggestions.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-neutral-50 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-800 rounded-xl">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">Suggestion</span>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* KEYWORDS TAB */}
        {activeTab === "keywords" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Skills Gap Analysis */}
            <div className="lg:col-span-2 bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-500" />
                <span>Skills Gap Analysis</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Skills you already have compared against vital keywords recruiters look for in high-paying postings.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Have */}
                <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 bg-emerald-50/5 dark:bg-emerald-950/5">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-3">✓ Present in Resume</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillsGap.have.map((skill, idx) => (
                      <span key={idx} className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30 font-medium">
                        {skill}
                      </span>
                    ))}
                    {analysis.skillsGap.have.length === 0 && (
                      <span className="text-xs text-neutral-400 italic">No matching skills detected.</span>
                    )}
                  </div>
                </div>

                {/* Need */}
                <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 bg-rose-50/5 dark:bg-rose-950/5">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mb-3">✗ Missing Recommendations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillsGap.need.map((skill, idx) => (
                      <span key={idx} className="text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-lg border border-rose-100/50 dark:border-rose-900/30 font-medium">
                        {skill}
                      </span>
                    ))}
                    {analysis.skillsGap.need.length === 0 && (
                      <span className="text-xs text-neutral-400 italic">No missing skills detected! Excellent depth.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Density List */}
            <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">ATS Keyword Matches</h3>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {analysis.keywords.map((kw, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 rounded-xl"
                  >
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-mono">{kw.keyword}</span>
                    <div className="flex items-center">
                      {kw.found ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Matched</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full font-medium">
                          <XCircle className="w-3 h-3" />
                          <span>Missing</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ONE-CLICK REWRITER */}
        {activeTab === "rewrite" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span>AI Segment Rewriter</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Paste any paragraph (your Summary, a Project description, or professional Experience bullets) to generate recruiters' preferred vocabulary.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Segment Type:</span>
                  <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                    {["summary", "experience", "project"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setRewriteType(type)}
                        className={`px-3 py-1 rounded-md transition-all ${
                          rewriteType === type
                            ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm font-medium"
                            : "text-neutral-400 hover:text-neutral-700"
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={rewriteText}
                  onChange={(e) => setRewriteText(e.target.value)}
                  placeholder="Paste your weak sentence or bullet here (e.g. 'Responsible for building an API and maintaining database')..."
                  rows={5}
                  className="w-full text-sm p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 dark:text-neutral-200 resize-y"
                />

                <button
                  id="trigger-rewrite-btn"
                  onClick={handleRewrite}
                  disabled={rewriting || !rewriteText.trim()}
                  className="w-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {rewriting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Polishing text...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Polish Segment with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Output */}
              <div className="border border-neutral-100 dark:border-neutral-800 rounded-2xl p-6 bg-neutral-50/50 dark:bg-neutral-950/25 flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Polished Output</span>
                    </span>
                    {rewrittenOutput && (
                      <button
                        onClick={() => copyToClipboard(rewrittenOutput, "polished")}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white font-medium"
                      >
                        {copiedIndex === "polished" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {rewrittenOutput ? (
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-4 rounded-xl shadow-sm">
                      {rewrittenOutput}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-400 space-y-2">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                      <p className="text-xs">Your polished segment will appear here.</p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-neutral-400 mt-4 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <strong>STAR Pattern Applied:</strong> Includes measurable impact indicators, industry action verbs, and clear ownership descriptions.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* INTERVIEW QUESTIONS TAB */}
        {activeTab === "questions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { type: "hr", label: "HR & Behavioral", color: "border-purple-500 bg-purple-50/10 text-purple-700" },
              { type: "technical", label: "Core Technical", color: "border-blue-500 bg-blue-50/10 text-blue-700" },
              { type: "project", label: "Project Architecture", color: "border-emerald-500 bg-emerald-50/10 text-emerald-700" },
            ].map((section) => (
              <div key={section.type} className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full border ${section.color}`} />
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{section.label}</h3>
                </div>

                <div className="space-y-4">
                  {(analysis.interviewQuestions[section.type as "hr" | "technical" | "project"] || []).map((q, idx) => (
                    <div key={idx} className="border border-neutral-50 dark:border-neutral-800/50 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Question {idx + 1}</span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed">{q}</p>
                      <div className="text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-900 pt-1.5 flex items-center gap-1">
                        <span className="text-neutral-500 font-bold">Answer Strategy:</span> Focus on STAR method.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
