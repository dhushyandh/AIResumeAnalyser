export interface KeywordMatch {
  keyword: string;
  found: boolean;
}

export interface SkillsGap {
  have: string[];
  need: string[];
}

export interface ProjectSuggestion {
  original: string;
  suggested: string;
}

export interface InterviewQuestions {
  hr: string[];
  technical: string[];
  project: string[];
}

export interface ResumeAnalysis {
  score: number;
  breakdown: {
    skills: number;
    projects: number;
    experience: number;
    keywords: number;
    formatting: number;
  };
  keywords: KeywordMatch[];
  skillsGap: SkillsGap;
  feedback: string[];
  projectSuggestions: ProjectSuggestion[];
  achievements: string[];
  interviewQuestions: InterviewQuestions;
  portfolioSuggestions: string[];
}

export interface ComparisonAnalysis {
  winner: string;
  scoreDifference: string;
  v1Score: number;
  v2Score: number;
  comparison: string;
  advantages: {
    v1: string[];
    v2: string[];
  };
  recommendation: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  resumeName: string;
  resumeText: string;
  jdName: string;
  jdText: string;
  score: number;
  analysis: ResumeAnalysis;
}
