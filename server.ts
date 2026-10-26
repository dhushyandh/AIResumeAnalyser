import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { initDb, query } from "./db";

// Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

// Enable JSON bodies with higher limits for handling PDF/text uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Helper to handle Gemini API errors gracefully
const handleApiError = (res: express.Response, error: any, customMessage: string) => {
  console.error(`${customMessage}:`, error);
  res.status(500).json({
    error: customMessage,
    details: error.message || String(error),
  });
};

// --- API Endpoints ---

// 1. Analyze Resume and Job Description (Features 3, 4, 5, 6, 8, 9, 10, 12)
app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescriptionText } = req.body;

    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({ error: "Resume text is required for analysis." });
    }

    const jdPrompt = jobDescriptionText && jobDescriptionText.trim() !== ""
      ? `Compare it against this target Job Description:\n=== JOB DESCRIPTION ===\n${jobDescriptionText}\n========================`
      : `Benchmark the resume across its specific professional industry and domain (e.g. Healthcare, Technology, Finance, Marketing, Law, Education, Sales, Operations, Engineering, Design, Administration, or Executive Leadership). Extract industry-standard core competencies, keywords, and recruiter expectations for that specific field.`;

    const prompt = `You are a universal senior talent acquisition director, executive recruiter, and ATS (Applicant Tracking System) intelligence expert spanning all professional fields and career disciplines.

First, identify the candidate's exact profession, industry, specialization, and seniority level from the resume text.
Next, perform an objective, rigorous, field-specific evaluation calibrated to real hiring manager expectations and modern ATS screening algorithms in their exact discipline.

=== RESUME TEXT ===
${resumeText}
==================

${jdPrompt}

Evaluation Guidelines for All Industries:
1. ATS Scoring (0-100%): Calibrated objectively based on:
   - Field-specific hard/technical skills and certifications
   - Quantified achievements, outcomes, and business/clinical/operational metrics
   - Chronology, title progression, and section clarity
   - ATS parsability (standard headers, clean layout, no keyword stuffing)
2. Keywords & Skills Gap:
   - Identify both foundational and advanced terminology, certifications, tools, methodologies, and core competencies relevant to the candidate's exact profession.
3. High-Impact Action Items:
   - Provide concrete, field-appropriate advice (e.g., for Healthcare: clinical rotations, patient census, charting systems, certifications; for Finance: financial modeling, GAAP/IFRS, audit experience, portfolio size; for Tech: architectures, languages, scale; for Sales: quota attainment, ARR, deal size; for Education: curriculum design, student outcomes, state certifications; for Law: bar admissions, litigation, matter management). Do not assume software/tech if the candidate is in another field!
4. Tailored Interview Preparation:
   - HR/Behavioral questions
   - Core Specialty/Domain questions (specific to their actual field)
   - Practical Scenario/Case questions (real scenarios they would face on the job).

Provide your feedback strictly in JSON format matching the specified schema. Ensure the score calculations are objective and realistic (standard resumes rarely get 100%).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "score",
            "breakdown",
            "keywords",
            "skillsGap",
            "feedback",
            "projectSuggestions",
            "achievements",
            "interviewQuestions",
            "portfolioSuggestions"
          ],
          properties: {
            score: {
              type: Type.INTEGER,
              description: "Overall ATS score from 0 to 100 based on standard recruiter screening."
            },
            breakdown: {
              type: Type.OBJECT,
              required: ["skills", "projects", "experience", "keywords", "formatting"],
              properties: {
                skills: { type: Type.INTEGER, description: "Skills match score (0-100)" },
                projects: { type: Type.INTEGER, description: "Projects rating score (0-100)" },
                experience: { type: Type.INTEGER, description: "Work experience description strength score (0-100)" },
                keywords: { type: Type.INTEGER, description: "Keyword density and ATS matching score (0-100)" },
                formatting: { type: Type.INTEGER, description: "Formatting and structure scan score (0-100)" }
              }
            },
            keywords: {
              type: Type.ARRAY,
              description: "Extracted keywords, highlighting whether they are present in the resume or missing.",
              items: {
                type: Type.OBJECT,
                required: ["keyword", "found"],
                properties: {
                  keyword: { type: Type.STRING },
                  found: { type: Type.BOOLEAN }
                }
              }
            },
            skillsGap: {
              type: Type.OBJECT,
              required: ["have", "need"],
              description: "Skills match analysis. 'have' lists current skills in resume, 'need' lists missing high-value skills requested in job description or standard market expectations.",
              properties: {
                have: { type: Type.ARRAY, items: { type: Type.STRING } },
                need: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            feedback: {
              type: Type.ARRAY,
              description: "Critical bulleted feedback on how to improve the resume tailored to their specific industry (e.g., 'Quantify impact with relevant metrics', 'Highlight state/board certifications and clinical/operational credentials').",
              items: { type: Type.STRING }
            },
            projectSuggestions: {
              type: Type.ARRAY,
              description: "Take 1-2 existing projects or experience items and show a rewritten, high-impact suggestions.",
              items: {
                type: Type.OBJECT,
                required: ["original", "suggested"],
                properties: {
                  original: { type: Type.STRING, description: "A simple or weak phrase or project bullet from the resume." },
                  suggested: { type: Type.STRING, description: "A highly polished, quantified, recruiter-friendly suggestion." }
                }
              }
            },
            achievements: {
              type: Type.ARRAY,
              description: "Generate 2-3 recruiter-friendly quantified achievements that align with this career path.",
              items: { type: Type.STRING }
            },
            interviewQuestions: {
              type: Type.OBJECT,
              required: ["hr", "technical", "project"],
              description: "Generate mock interview questions tailored to the resume and target job role.",
              properties: {
                hr: { type: Type.ARRAY, items: { type: Type.STRING } },
                technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                project: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            portfolioSuggestions: {
              type: Type.ARRAY,
              description: "Actionable portfolio/online presence suggestions (e.g. Case studies, metrics, certifications, blog).",
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text returned from Gemini API.");
    }

    const data = JSON.parse(resultText.trim());
    res.json(data);
  } catch (error) {
    handleApiError(res, error, "Failed to analyze resume");
  }
});

// 2. Resume Rewrite / Polish (Feature 7)
app.post("/api/rewrite", async (req, res) => {
  try {
    const { text, type, jobDescription } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Text to rewrite is required." });
    }

    const jdContext = jobDescription && jobDescription.trim() !== ""
      ? `Ensure it aligns closely with the keywords and demands of this target Job Description:\n${jobDescription}`
      : "Ensure it uses industry-standard high-impact verbs and best practices for modern corporate hiring.";

    const prompt = `You are an elite career coach and resume writer. 
Rewrite the following segment of a resume to sound significantly more professional, highly accomplished, and recruiter-friendly.

Segment Type: ${type || "general experience"}
Current Segment Content:
"${text}"

${jdContext}

Rules:
- Actively integrate action verbs (e.g. Orchestrated, Engineered, Spearheaded, Championed).
- Introduce realistic metric placeholders or enhance existing ones (e.g., 'increased performance by 35%', 'reduced page load time by 1.2 seconds').
- Keep the length proportional and clear.
- Return ONLY the polished rewrite as a single plain text string, do not wrap in markdown quotes or extra dialogue.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ rewrittenText: response.text?.trim() || text });
  } catch (error) {
    handleApiError(res, error, "Failed to rewrite resume text");
  }
});

// 3. Achievement Generator (Feature 9)
app.post("/api/achievement-generator", async (req, res) => {
  try {
    const { task, role } = req.body;

    if (!task || task.trim() === "") {
      return res.status(400).json({ error: "Task or role description is required." });
    }

    const prompt = `You are an expert resume writer and career coach across all industries. 
Convert the following work description or task into 3 distinct, high-impact bullet points for a resume.
Each bullet point MUST follow the STAR/XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].
Use active, powerful verbs and include quantified metrics relevant to the context of their specific profession (e.g. revenue growth, patient outcomes, hours saved, audit success, error reductions, efficiency gains).

Current Task: "${task}"
Target Role Context: "${role || "Professional in candidate's specified field"}"

Provide your output strictly in JSON format matching this schema:
{
  "achievements": [
    "achievement 1",
    "achievement 2",
    "achievement 3"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["achievements"],
          properties: {
            achievements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3 high-impact accomplishments with realistic metrics."
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    const data = JSON.parse(resultText.trim());
    res.json(data);
  } catch (error) {
    handleApiError(res, error, "Failed to generate achievements");
  }
});

// 4. Cover Letter Generator (Feature 11)
app.post("/api/cover-letter", async (req, res) => {
  try {
    const { resumeText, jobDescriptionText, style } = req.body;

    if (!resumeText || !jobDescriptionText) {
      return res.status(400).json({ error: "Both Resume and Job Description are required to generate a cover letter." });
    }

    const styleGuide: Record<string, string> = {
      formal: "Corporate & Formal: Structured, respectful, meticulous, emphasizing credentials, ethical standards, regulatory compliance, and a proven track record. Ideal for Finance, Healthcare, Legal, and Enterprise roles.",
      executive: "Executive & Strategic: Focus on high-level leadership, vision, operational excellence, fiscal stewardship, and strategic ROI. Authoritative, dignified, and compelling.",
      impact: "Results & Metrics-Driven: Direct, performance-oriented, highlighting quantifiable achievements, KPIs, problem-solving, and measurable value delivered.",
      creative: "Engaging & Modern: Energetic, authentic, narrative-driven, showcasing passion, adaptability, client rapport, and creative vision. Ideal for Marketing, Design, Sales, and Innovation roles.",
      // Legacy aliases for backward compatibility
      google: "Innovative and structured, emphasizing analytical problem solving, scale, and cross-functional collaboration.",
      amazon: "High-velocity, focused on ownership, customer outcomes, bias for action, and data-backed deliverables.",
      microsoft: "Growth-mindset, collaborative excellence, enterprise impact, and continuous learning.",
      startup: "Energetic, versatile, proactive, highlighting rapid execution and full-lifecycle ownership."
    };

    const targetStyle = styleGuide[style as string] || styleGuide.formal;

    const prompt = `You are an elite career coach and executive resume consultant across all industries. Write a customized, compelling, single-page cover letter applying for a role defined by the Job Description below, leveraging genuine qualifications and achievements from the user's Resume.

Style Directive: ${targetStyle}

=== USER RESUME ===
${resumeText}
==================

=== TARGET JOB DESCRIPTION ===
${jobDescriptionText}
=============================

Formatting Rules:
- Address it to the hiring manager.
- Make it 3-4 paragraphs maximum.
- Do NOT make up crazy lies, but highlight actual matching tech stacks, achievements, and passions from the resume.
- Make sure it sounds authentic and highly polished.
- Do not add conversational comments before or after the cover letter. Return ONLY the final formatted letter.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ coverLetterText: response.text?.trim() || "" });
  } catch (error) {
    handleApiError(res, error, "Failed to generate cover letter");
  }
});

// 5. Resume Comparison (Feature 13)
app.post("/api/compare", async (req, res) => {
  try {
    const { resumeV1Text, resumeV2Text, jobDescriptionText } = req.body;

    if (!resumeV1Text || !resumeV2Text) {
      return res.status(400).json({ error: "Both Version 1 and Version 2 resume texts are required for comparison." });
    }

    const jdPrompt = jobDescriptionText && jobDescriptionText.trim() !== ""
      ? `Assess both in reference to this target Job Description:\n${jobDescriptionText}`
      : `Assess both on general readability, keyword strength, corporate presentation, and detail quality.`;

    const prompt = `You are a professional recruiting coordinator. Compare the following two versions of a candidate's resume (Version 1 vs Version 2).
${jdPrompt}

Provide an objective review of which version is superior, the ATS score difference, and specific structural or contextual advantages of each.

=== RESUME VERSION 1 ===
${resumeV1Text}
========================

=== RESUME VERSION 2 ===
${resumeV2Text}
========================

Provide your response strictly in JSON format matching this schema:
{
  "winner": "Version 1" or "Version 2",
  "scoreDifference": "e.g. +10 ATS Score Improvement",
  "v1Score": number,
  "v2Score": number,
  "comparison": "Paragraph comparing both versions",
  "advantages": {
    "v1": ["advantage 1", "advantage 2"],
    "v2": ["advantage 1", "advantage 2"]
  },
  "recommendation": "Summary advice on what to merge or finalize."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["winner", "scoreDifference", "v1Score", "v2Score", "comparison", "advantages", "recommendation"],
          properties: {
            winner: { type: Type.STRING, description: "Which version is overall superior ('Version 1' or 'Version 2')" },
            scoreDifference: { type: Type.STRING, description: "The score difference summary (e.g. '+12 ATS Score Improvement')" },
            v1Score: { type: Type.INTEGER },
            v2Score: { type: Type.INTEGER },
            comparison: { type: Type.STRING, description: "A detailed paragraph evaluating V1 vs V2." },
            advantages: {
              type: Type.OBJECT,
              required: ["v1", "v2"],
              properties: {
                v1: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Advantage bullets of Version 1" },
                v2: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Advantage bullets of Version 2" }
              }
            },
            recommendation: { type: Type.STRING, description: "Final recommendation on which elements to keep." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No comparison output returned from Gemini.");
    }

    const data = JSON.parse(resultText.trim());
    res.json(data);
  } catch (error) {
    handleApiError(res, error, "Failed to compare resumes");
  }
});

// 6. AI Resume Generator
app.post("/api/generate-resume", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ error: "Background prompt is required." });
    }

    const geminiPrompt = `You are an expert resume writer and career coach. 
Generate a professional, high-impact, comprehensive resume in plain-text/markdown format based on the following candidate background prompt:
"${prompt}"

Structure the resume professionally with:
- Contact Information (use realistic placeholders)
- Professional Summary (high impact, tailored to their goals)
- Core Skills & Technologies
- Professional Experience / Projects (include responsibilities and quantified accomplishments)
- Education & Certifications

Avoid generic placeholders like [Your Name] where possible, instead provide high-quality realistic example data that matches the background.
Return ONLY the final resume in plain-text markdown, without any preamble or conversational dialogue.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiPrompt,
    });

    res.json({ resumeText: response.text?.trim() || "" });
  } catch (error) {
    handleApiError(res, error, "Failed to generate initial resume");
  }
});

// 7. AI Resume Improver
app.post("/api/improve-resume", async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || resumeText.trim() === "") {
      return res.status(400).json({ error: "Resume text is required." });
    }

    const geminiPrompt = `You are an elite corporate recruiter and resume editor. 
Take this resume and rewrite/polish it to achieve:
1. Better wording: Use action-oriented, professional verbs (e.g., Spearheaded, Orchestrated).
2. Better formatting: Organize sections cleanly with modern layout aesthetics.
3. Better readability: Bullet points should be short, punchy, and make use of numbers/metrics.

=== RESUME TEXT ===
${resumeText}
===================

Provide the response strictly in JSON format matching this schema:
{
  "improvedText": "The fully polished and rewritten resume in plain text markdown format",
  "changesMade": ["Short summary of key change 1", "Short summary of key change 2", "Short summary of key change 3"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["improvedText", "changesMade"],
          properties: {
            improvedText: { type: Type.STRING, description: "The full polished resume text." },
            changesMade: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of summaries of changes." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    handleApiError(res, error, "Failed to improve resume");
  }
});

// 8. AI Keyword Generator
app.post("/api/generate-keywords", async (req, res) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole || targetRole.trim() === "") {
      return res.status(400).json({ error: "Target role is required." });
    }

    const geminiPrompt = `You are an ATS (Applicant Tracking System) optimizer.
For the target job role "${targetRole}", generate a list of 10-15 highly sought-after industry-standard keywords, technical skills, frameworks, and tools that professional recruiters scan for.

Provide the response strictly in JSON format matching this schema:
{
  "keywords": ["Keyword 1", "Keyword 2", "Keyword 3", ...]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["keywords"],
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Highly relevant keywords." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    handleApiError(res, error, "Failed to generate keywords");
  }
});

// 9. Resume Tailoring
app.post("/api/tailor-resume", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "Both Resume text and Job Description are required." });
    }

    const geminiPrompt = `You are an elite career coach. Tailor the candidate's resume specifically to align with the provided Job Description. 
Integrate relevant job keywords and requirements naturally, emphasize projects or skills that match the JD, and rephrase accomplishments to highlight the expected competencies. Do not lie, but frame the existing experience optimally.

=== RESUME ===
${resumeText}

=== JOB DESCRIPTION ===
${jobDescription}

Provide the response strictly in JSON format matching this schema:
{
  "tailoredText": "The customized tailored resume in plain text markdown format",
  "highlights": ["What you tailored/why 1", "What you tailored/why 2", "What you tailored/why 3"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["tailoredText", "highlights"],
          properties: {
            tailoredText: { type: Type.STRING, description: "The complete tailored resume." },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Brief notes on what was optimized." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    handleApiError(res, error, "Failed to tailor resume");
  }
});

// --- Database Persisted API Endpoints ---

// Middleware to require x-user-id header
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized. Missing x-user-id header." });
  }
  (req as any).userId = userId as string;
  next();
};

// 10. Sync User
app.post("/api/users/sync", async (req, res) => {
  try {
    const { id, emailAddress, firstName, lastName, imageUrl } = req.body;
    if (!id || !emailAddress) {
      return res.status(400).json({ error: "User ID and Email are required for sync." });
    }

    const result = await query(
      `INSERT INTO users (id, email, first_name, last_name, image_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           image_url = EXCLUDED.image_url,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, emailAddress, firstName || null, lastName || null, imageUrl || null]
    );

    res.json({ message: "User synced successfully", user: result.rows[0] });
  } catch (error) {
    handleApiError(res, error, "Failed to sync user");
  }
});

// 11. Resumes CRUD
app.get("/api/resumes", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await query(
      `SELECT r.*, 
              (SELECT score FROM resume_versions rv WHERE rv.resume_id = r.id ORDER BY rv.version_number DESC LIMIT 1) as latest_score,
              (SELECT version_number FROM resume_versions rv WHERE rv.resume_id = r.id ORDER BY rv.version_number DESC LIMIT 1) as latest_version
       FROM resumes r
       WHERE r.user_id = $1
       ORDER BY r.updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleApiError(res, error, "Failed to fetch resumes");
  }
});

app.get("/api/resumes/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const result = await query(
      `SELECT r.*, 
              COALESCE(
                (
                  SELECT json_agg(rv.* ORDER BY rv.version_number DESC)
                  FROM resume_versions rv
                  WHERE rv.resume_id = r.id
                ),
                '[]'::json
              ) as versions
       FROM resumes r
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    handleApiError(res, error, "Failed to fetch resume details");
  }
});

app.post("/api/resumes", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { filename, content, score, changesMade, resumeId } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: "Filename and content are required." });
    }

    let finalResumeId = resumeId;

    if (finalResumeId) {
      // Check if resume exists for user
      const existing = await query(`SELECT id FROM resumes WHERE id = $1 AND user_id = $2`, [finalResumeId, userId]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Resume not found or access denied." });
      }

      // Check if content is different from the latest version to avoid duplicate versioning
      const latestVerRes = await query(
        `SELECT content, version_number FROM resume_versions WHERE resume_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [finalResumeId]
      );

      if (latestVerRes.rows.length > 0 && latestVerRes.rows[0].content === content) {
        // Just update updated_at and filename
        await query(
          `UPDATE resumes SET filename = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [filename, finalResumeId]
        );
        // Also update score of latest version if provided
        if (score !== undefined) {
          await query(
            `UPDATE resume_versions SET score = $1 WHERE resume_id = $2 AND version_number = $3`,
            [score, finalResumeId, latestVerRes.rows[0].version_number]
          );
        }
      } else {
        // Content changed, update main resume and add new version
        const nextVer = latestVerRes.rows.length > 0 ? latestVerRes.rows[0].version_number + 1 : 1;
        await query(
          `UPDATE resumes SET filename = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [filename, content, finalResumeId]
        );
        await query(
          `INSERT INTO resume_versions (resume_id, version_number, content, changes_made, score)
           VALUES ($1, $2, $3, $4, $5)`,
          [finalResumeId, nextVer, content, JSON.stringify(changesMade || []), score || null]
        );
      }
    } else {
      // Create new resume
      const newResume = await query(
        `INSERT INTO resumes (user_id, filename, content)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, filename, content]
      );
      finalResumeId = newResume.rows[0].id;

      // Create version 1
      await query(
        `INSERT INTO resume_versions (resume_id, version_number, content, changes_made, score)
         VALUES ($1, 1, $2, $3, $4)`,
        [finalResumeId, content, JSON.stringify(changesMade || []), score || null]
      );
    }

    const fullResume = await query(
      `SELECT r.*, 
              COALESCE(
                (
                  SELECT json_agg(rv.* ORDER BY rv.version_number DESC)
                  FROM resume_versions rv
                  WHERE rv.resume_id = r.id
                ),
                '[]'::json
              ) as versions
       FROM resumes r
       WHERE r.id = $1`,
      [finalResumeId]
    );

    res.json(fullResume.rows[0]);
  } catch (error) {
    handleApiError(res, error, "Failed to save resume");
  }
});

// 12. Job Descriptions CRUD
app.get("/api/job-descriptions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await query(
      `SELECT * FROM job_descriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleApiError(res, error, "Failed to fetch job descriptions");
  }
});

app.post("/api/job-descriptions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, content, jobDescriptionId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    if (jobDescriptionId) {
      const result = await query(
        `UPDATE job_descriptions 
         SET title = $1, content = $2 
         WHERE id = $3 AND user_id = $4 
         RETURNING *`,
        [title, content, jobDescriptionId, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Job description not found or access denied." });
      }
      res.json(result.rows[0]);
    } else {
      // Dedup check
      const existing = await query(
        `SELECT * FROM job_descriptions WHERE user_id = $1 AND title = $2 AND content = $3`,
        [userId, title, content]
      );
      if (existing.rows.length > 0) {
        res.json(existing.rows[0]);
      } else {
        const result = await query(
          `INSERT INTO job_descriptions (user_id, title, content) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [userId, title, content]
        );
        res.json(result.rows[0]);
      }
    }
  } catch (error) {
    handleApiError(res, error, "Failed to save job description");
  }
});

// 13. Analysis History CRUD
app.get("/api/history", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await query(
      `SELECT ah.*, 
              r.filename as resume_name,
              jd.title as jd_name
       FROM analysis_history ah
       LEFT JOIN resumes r ON r.id = ah.resume_id
       LEFT JOIN job_descriptions jd ON jd.id = ah.job_description_id
       WHERE ah.user_id = $1
       ORDER BY ah.created_at DESC`,
      [userId]
    );

    // Map keys to frontend HistoryItem style
    const mapped = result.rows.map(row => ({
      id: row.id,
      date: new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      resumeId: row.resume_id,
      resumeName: row.resume_name || "Uploaded Resume",
      resumeText: "", 
      resumeVersionId: row.resume_version_id,
      jdId: row.job_description_id,
      jdName: row.jd_name || "Standard Analysis",
      jdText: "",
      score: row.score,
      analysis: {
        score: row.score,
        breakdown: row.breakdown,
        keywords: row.keywords,
        skillsGap: row.skills_gap,
        feedback: row.feedback,
        projectSuggestions: row.project_suggestions,
        achievements: row.achievements,
        interviewQuestions: row.interview_questions,
        portfolioSuggestions: row.portfolio_suggestions
      }
    }));

    res.json(mapped);
  } catch (error) {
    handleApiError(res, error, "Failed to fetch history list");
  }
});

app.post("/api/history", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { 
      resumeId, 
      jobDescriptionId, 
      score, 
      breakdown, 
      keywords, 
      skillsGap, 
      feedback, 
      projectSuggestions, 
      achievements, 
      interviewQuestions, 
      portfolioSuggestions 
    } = req.body;

    if (!resumeId || score === undefined) {
      return res.status(400).json({ error: "resumeId and score are required." });
    }

    // Get latest version ID for the resume
    const verRes = await query(
      `SELECT id FROM resume_versions WHERE resume_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [resumeId]
    );
    const resumeVersionId = verRes.rows.length > 0 ? verRes.rows[0].id : null;

    const result = await query(
      `INSERT INTO analysis_history (
        user_id, resume_id, resume_version_id, job_description_id, score,
        breakdown, keywords, skills_gap, feedback, project_suggestions,
        achievements, interview_questions, portfolio_suggestions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        userId,
        resumeId,
        resumeVersionId,
        jobDescriptionId || null,
        score,
        JSON.stringify(breakdown || {}),
        JSON.stringify(keywords || []),
        JSON.stringify(skillsGap || {}),
        JSON.stringify(feedback || []),
        JSON.stringify(projectSuggestions || []),
        JSON.stringify(achievements || []),
        JSON.stringify(interviewQuestions || {}),
        JSON.stringify(portfolioSuggestions || [])
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    handleApiError(res, error, "Failed to save analysis history");
  }
});

app.delete("/api/history/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    await query(`DELETE FROM analysis_history WHERE id = $1 AND user_id = $2`, [id, userId]);
    res.json({ success: true, message: "History item deleted" });
  } catch (error) {
    handleApiError(res, error, "Failed to delete history item");
  }
});

// 14. Cover Letters CRUD
app.get("/api/cover-letters", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await query(
      `SELECT cl.*, 
              r.filename as resume_name, 
              jd.title as jd_name
       FROM cover_letters cl
       LEFT JOIN resumes r ON r.id = cl.resume_id
       LEFT JOIN job_descriptions jd ON jd.id = cl.job_description_id
       WHERE cl.user_id = $1
       ORDER BY cl.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    handleApiError(res, error, "Failed to fetch cover letters");
  }
});

app.post("/api/cover-letters", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { resumeId, jobDescriptionId, content, style } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required." });
    }

    const result = await query(
      `INSERT INTO cover_letters (user_id, resume_id, job_description_id, content, style)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, resumeId || null, jobDescriptionId || null, content, style || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    handleApiError(res, error, "Failed to save cover letter");
  }
});

app.delete("/api/cover-letters/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    await query(`DELETE FROM cover_letters WHERE id = $1 AND user_id = $2`, [id, userId]);
    res.json({ success: true, message: "Cover letter deleted" });
  } catch (error) {
    handleApiError(res, error, "Failed to delete cover letter");
  }
});

// --- Frontend Dev Server Integration ---

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("Database initialization failed. App starting with disabled or degraded database state.", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(` Server listening on http://localhost:${PORT}`);
  });
}

startServer();
