import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ DATABASE_URL is not set in environment. Database persistence will be disabled.");
}

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

// Database helper function
export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error("Database connection is not configured. Please set DATABASE_URL.");
  }
  return pool.query(text, params);
}

// Automatically initialize database tables on startup
export async function initDb() {
  if (!pool) {
    console.log("⚠️ Skipping database initialization: No connection configured.");
    return;
  }

  console.log("🔄 Initializing database tables...");

  try {
    // 1. Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Resumes Table
    await query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Resume Versions Table
    await query(`
      CREATE TABLE IF NOT EXISTS resume_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        changes_made JSONB,
        score INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(resume_id, version_number)
      );
    `);

    // 4. Create Job Descriptions Table
    await query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create Analysis History Table
    await query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
        job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
        score INTEGER NOT NULL,
        breakdown JSONB NOT NULL,
        keywords JSONB NOT NULL,
        skills_gap JSONB NOT NULL,
        feedback JSONB NOT NULL,
        project_suggestions JSONB NOT NULL,
        achievements JSONB NOT NULL,
        interview_questions JSONB NOT NULL,
        portfolio_suggestions JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create Cover Letters Table
    await query(`
      CREATE TABLE IF NOT EXISTS cover_letters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
        job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        style VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Database initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}
