import { motion } from "motion/react";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface MetricCardProps {
  score: number;
  breakdown: {
    skills: number;
    projects: number;
    experience: number;
    keywords: number;
    formatting: number;
  };
}

export default function MetricCard({ score, breakdown }: MetricCardProps) {
  // Determine score color and label
  let scoreColor = "text-emerald-500 stroke-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
  let scoreText = "Excellent Match";
  let scoreIcon = <CheckCircle className="w-5 h-5 text-emerald-500" />;

  if (score < 60) {
    scoreColor = "text-rose-500 stroke-rose-500 bg-rose-50 dark:bg-rose-950/20";
    scoreText = "Needs Improvement";
    scoreIcon = <AlertCircle className="w-5 h-5 text-rose-500" />;
  } else if (score < 80) {
    scoreColor = "text-amber-500 stroke-amber-500 bg-amber-50 dark:bg-amber-950/20";
    scoreText = "Competitive Score";
    scoreIcon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
  }

  // Circular gauge config
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/65 dark:bg-neutral-900/65 backdrop-blur-md rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm">
      {/* Circle Gauge */}
      <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-4">Overall ATS Score</h3>
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background track */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-neutral-100 dark:stroke-neutral-800"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Foreground circle */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              className={scoreColor}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{score}%</span>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mt-0.5">Match Rate</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 mt-4 rounded-full text-xs font-medium ${scoreColor}`}>
          {scoreIcon}
          <span>{scoreText}</span>
        </div>
      </div>

      {/* Breakdown sliders */}
      <div className="md:col-span-2 flex flex-col justify-center gap-4 py-2">
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Section Evaluation</h3>
        
        {Object.entries(breakdown).map(([key, val]) => {
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
          let barColor = "bg-neutral-900 dark:bg-neutral-200";
          if (val < 60) barColor = "bg-rose-500";
          else if (val < 80) barColor = "bg-amber-500";
          else barColor = "bg-emerald-500";

          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span>{formattedKey}</span>
                <span>{val}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${barColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
