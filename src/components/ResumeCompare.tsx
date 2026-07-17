import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Clipboard, RefreshCw, Sparkles, Columns, Upload, AlertCircle, TrendingUp, Award, Layers, Database } from "lucide-react";
import { ComparisonAnalysis } from "../types";
import { extractTextFromPdf } from "../utils/pdfParser";
import { useUser } from "./ClerkAuth";

export default function ResumeCompare() {
  const { isSignedIn, user } = useUser();
  const [v1Text, setV1Text] = useState("");
  const [v1Name, setV1Name] = useState("");
  const [v2Text, setV2Text] = useState("");
  const [v2Name, setV2Name] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdName, setJdName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // DB integration states
  const [dbResumes, setDbResumes] = useState<any[]>([]);
  const [dbVersionsV1, setDbVersionsV1] = useState<any[]>([]);
  const [dbVersionsV2, setDbVersionsV2] = useState<any[]>([]);
  const [selectedResumeIdV1, setSelectedResumeIdV1] = useState<string>("");
  const [selectedResumeIdV2, setSelectedResumeIdV2] = useState<string>("");

  const fileInputV1 = useRef<HTMLInputElement>(null);
  const fileInputV2 = useRef<HTMLInputElement>(null);
  const fileInputJd = useRef<HTMLInputElement>(null);

  // Load saved resumes from DB on mount / login
  useEffect(() => {
    if (isSignedIn && user) {
      fetch("/api/resumes", {
        headers: { "x-user-id": user.id }
      })
      .then(res => res.json())
      .then(data => setDbResumes(data))
      .catch(err => console.error("Error loading resumes for comparison:", err));
    }
  }, [isSignedIn, user]);

  const handleSelectResume = async (id: string, target: "v1" | "v2") => {
    if (!id || !user) {
      if (target === "v1") {
        setSelectedResumeIdV1("");
        setDbVersionsV1([]);
        setV1Text("");
        setV1Name("");
      } else {
        setSelectedResumeIdV2("");
        setDbVersionsV2([]);
        setV2Text("");
        setV2Name("");
      }
      return;
    }

    try {
      if (target === "v1") {
        setSelectedResumeIdV1(id);
      } else {
        setSelectedResumeIdV2(id);
      }

      const res = await fetch(`/api/resumes/${id}`, {
        headers: { "x-user-id": user.id }
      });
      const data = await res.json();
      
      const versions = data.versions || [];
      const latestVer = versions[0]; // ordered DESC by version_number

      if (target === "v1") {
        setDbVersionsV1(versions);
        setV1Text(latestVer?.content || data.content || "");
        setV1Name(`${data.filename} (v${latestVer?.version_number || 1})`);
      } else {
        setDbVersionsV2(versions);
        setV2Text(latestVer?.content || data.content || "");
        setV2Name(`${data.filename} (v${latestVer?.version_number || 1})`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load resume details from database.");
    }
  };

  const handlePdfUpload = async (file: File, target: "v1" | "v2" | "jd") => {
    try {
      setError(null);
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      if (target === "v1") {
        setV1Text(text);
        setV1Name(file.name);
      } else if (target === "v2") {
        setV2Text(text);
        setV2Name(file.name);
      } else {
        setJdText(text);
        setJdName(file.name);
      }
    } catch (err: any) {
      setError(err.message || "Failed to extract text from file.");
    }
  };

  const handleCompare = async () => {
    if (!v1Text || !v2Text) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeV1Text: v1Text,
          resumeV2Text: v2Text,
          jobDescriptionText: jdText
        })
      });
      const data = await res.json();
      if (data.winner) {
        setAnalysis(data);
      } else {
        setError(data.error || "An error occurred during comparison.");
      }
    } catch (err) {
      setError("Failed to connect to comparison API.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, indexId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(indexId);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-2">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-neutral-500" />
          <span>A/B Resume Version Comparison</span>
        </h3>
        <p className="text-xs text-neutral-400">
          Compare version revisions side-by-side. Discover which layout or context performs better in modern applicant screening environments.
        </p>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version 1 */}
        <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Resume Version 1</span>
              <input
                ref={fileInputV1}
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0], "v1")}
                className="hidden"
              />
              <button
                onClick={() => fileInputV1.current?.click()}
                className="flex items-center gap-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200"
              >
                <Upload className="w-3 h-3" />
                <span>{v1Name ? "Change" : "Upload File"}</span>
              </button>
            </div>
            {isSignedIn && dbResumes.length > 0 && (
              <div className="flex gap-2">
                <select
                  onChange={(e) => handleSelectResume(e.target.value, "v1")}
                  value={selectedResumeIdV1 || ""}
                  className="w-full text-[10px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 focus:outline-none truncate"
                >
                  <option value="">Load from Database</option>
                  {dbResumes.map(r => (
                    <option key={r.id} value={r.id}>{r.filename}</option>
                  ))}
                </select>
                {selectedResumeIdV1 && dbVersionsV1.length > 1 && (
                  <select
                    onChange={(e) => {
                      const ver = dbVersionsV1.find(v => v.version_number === parseInt(e.target.value));
                      if (ver) {
                        setV1Text(ver.content);
                        setV1Name(`${v1Name.split(" (v")[0]} (v${ver.version_number})`);
                      }
                    }}
                    className="text-[10px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 focus:outline-none shrink-0"
                  >
                    {dbVersionsV1.map(v => (
                      <option key={v.id} value={v.version_number}>v{v.version_number}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <textarea
            value={v1Text}
            onChange={(e) => {
              setV1Text(e.target.value);
              setV1Name(e.target.value ? "Pasted Version 1" : "");
            }}
            placeholder="Paste text of your older/first resume here..."
            rows={5}
            className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 resize-y"
          />
          {v1Name && <div className="text-[10px] text-neutral-400">Loaded: {v1Name}</div>}
        </div>

        {/* Version 2 */}
        <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Resume Version 2</span>
              <input
                ref={fileInputV2}
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0], "v2")}
                className="hidden"
              />
              <button
                onClick={() => fileInputV2.current?.click()}
                className="flex items-center gap-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200"
              >
                <Upload className="w-3 h-3" />
                <span>{v2Name ? "Change" : "Upload File"}</span>
              </button>
            </div>
            {isSignedIn && dbResumes.length > 0 && (
              <div className="flex gap-2">
                <select
                  onChange={(e) => handleSelectResume(e.target.value, "v2")}
                  value={selectedResumeIdV2 || ""}
                  className="w-full text-[10px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 focus:outline-none truncate"
                >
                  <option value="">Load from Database</option>
                  {dbResumes.map(r => (
                    <option key={r.id} value={r.id}>{r.filename}</option>
                  ))}
                </select>
                {selectedResumeIdV2 && dbVersionsV2.length > 1 && (
                  <select
                    onChange={(e) => {
                      const ver = dbVersionsV2.find(v => v.version_number === parseInt(e.target.value));
                      if (ver) {
                        setV2Text(ver.content);
                        setV2Name(`${v2Name.split(" (v")[0]} (v${ver.version_number})`);
                      }
                    }}
                    className="text-[10px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 focus:outline-none shrink-0"
                  >
                    {dbVersionsV2.map(v => (
                      <option key={v.id} value={v.version_number}>v{v.version_number}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <textarea
            value={v2Text}
            onChange={(e) => {
              setV2Text(e.target.value);
              setV2Name(e.target.value ? "Pasted Version 2" : "");
            }}
            placeholder="Paste text of your revised/second resume here..."
            rows={5}
            className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 resize-y"
          />
          {v2Name && <div className="text-[10px] text-neutral-400">Loaded: {v2Name}</div>}
        </div>

        {/* Optional Target Job Description */}
        <div className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Target JD (Optional)</span>
            <input
              ref={fileInputJd}
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0], "jd")}
              className="hidden"
            />
            <button
              onClick={() => fileInputJd.current?.click()}
              className="flex items-center gap-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-200"
            >
              <Upload className="w-3 h-3" />
              <span>{jdName ? "Change" : "Upload File"}</span>
            </button>
          </div>

          <textarea
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              setJdName(e.target.value ? "Pasted JD" : "");
            }}
            placeholder="Paste target job description to match core requirements..."
            rows={5}
            className="w-full text-xs p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400 placeholder:text-neutral-400 resize-y"
          />
          {jdName && <div className="text-[10px] text-neutral-400">Loaded: {jdName}</div>}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Compare Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleCompare}
          disabled={loading || !v1Text || !v2Text}
          className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-8 py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running A/B Comparison...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Compare Versions</span>
            </>
          )}
        </button>
      </div>

      {/* Comparison Verdict */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6"
        >
          {/* Winner Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-5 rounded-2xl">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">A/B Match Verdict</span>
              <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <span>Winner: {analysis.winner}</span>
              </h4>
              <p className="text-xs text-neutral-500">{analysis.comparison}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center bg-white dark:bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <div className="text-[9px] uppercase font-bold text-neutral-400">V1 Score</div>
                <div className="text-lg font-bold text-neutral-700 dark:text-neutral-300">{analysis.v1Score}%</div>
              </div>
              <div className="text-center bg-white dark:bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm ring-1 ring-emerald-500/20">
                <div className="text-[9px] uppercase font-bold text-emerald-500">V2 Score</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{analysis.v2Score}%</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* V1 Advantages */}
            <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-5 bg-neutral-50/40 dark:bg-neutral-950/20 space-y-3">
              <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Version 1 Advantages</h5>
              <ul className="space-y-2">
                {analysis.advantages.v1.map((adv, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-400 items-start">
                    <span className="text-neutral-400 mt-0.5">•</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* V2 Advantages */}
            <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-5 bg-emerald-50/5 dark:bg-emerald-950/5 space-y-3">
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Version 2 Advantages</h5>
              <ul className="space-y-2">
                {analysis.advantages.v2.map((adv, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-emerald-700 dark:text-emerald-300 items-start">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Merge Recommendation */}
          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-500 block">Recommended Strategy</span>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
              {analysis.recommendation}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
