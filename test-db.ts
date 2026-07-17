import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

async function testDatabase() {
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set in environment. Skipping database operations tests.");
    console.log("Please define DATABASE_URL in your .env file.");
    return;
  }

  console.log("🔌 Connecting to database...");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log("✅ Connection established.");

  try {
    console.log("🛠️ Testing table migrations...");
    // 1. Users
    await client.query(`
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

    // 2. Resumes
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Resume Versions
    await client.query(`
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

    // 4. Job Descriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Analysis History
    await client.query(`
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

    // 6. Cover Letters
    await client.query(`
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
    console.log("✅ Schema validated.");

    console.log("🧪 Inserting test user...");
    const testUserId = "test_user_" + Date.now();
    await client.query(
      `INSERT INTO users (id, email, first_name, last_name) VALUES ($1, $2, 'Test', 'Developer')`,
      [testUserId, `${testUserId}@example.com`]
    );
    console.log("✅ User inserted.");

    console.log("🧪 Inserting test resume and version...");
    const resumeInsert = await client.query(
      `INSERT INTO resumes (user_id, filename, content) VALUES ($1, 'resume.pdf', 'Software engineer skills') RETURNING id`,
      [testUserId]
    );
    const resumeId = resumeInsert.rows[0].id;

    await client.query(
      `INSERT INTO resume_versions (resume_id, version_number, content, score) VALUES ($1, 1, 'Software engineer skills', 85)`,
      [resumeId]
    );
    console.log("✅ Resume and Version 1 inserted.");

    console.log("🧪 Inserting test Job Description...");
    const jdInsert = await client.query(
      `INSERT INTO job_descriptions (user_id, title, content) VALUES ($1, 'Staff Software Engineer', 'Requires TypeScript & Postgres') RETURNING id`,
      [testUserId]
    );
    const jdId = jdInsert.rows[0].id;
    console.log("✅ Job Description inserted.");

    console.log("🧪 Inserting test analysis history log...");
    await client.query(
      `INSERT INTO analysis_history (
        user_id, resume_id, job_description_id, score, breakdown, keywords, skills_gap, feedback, project_suggestions, achievements, interview_questions, portfolio_suggestions
      ) VALUES ($1, $2, $3, 85, '{}', '[]', '{"have":[],"need":[]}', '[]', '[]', '[]', '{}', '[]')`,
      [testUserId, resumeId, jdId]
    );
    console.log("✅ History item inserted.");

    console.log("🧪 Inserting test cover letter...");
    await client.query(
      `INSERT INTO cover_letters (user_id, resume_id, job_description_id, content, style) VALUES ($1, $2, $3, 'Dear hiring manager...', 'startup')`,
      [testUserId, resumeId, jdId]
    );
    console.log("✅ Cover Letter inserted.");

    console.log("🧪 Querying inserted data to verify hydration...");
    const queryRes = await client.query(
      `SELECT cl.*, r.filename as resume_name, jd.title as jd_title 
       FROM cover_letters cl
       LEFT JOIN resumes r ON r.id = cl.resume_id
       LEFT JOIN job_descriptions jd ON jd.id = cl.job_description_id
       WHERE cl.user_id = $1`,
      [testUserId]
    );
    console.log("📊 Hydra query count:", queryRes.rows.length);
    console.log("📋 First row summary:", {
      id: queryRes.rows[0].id,
      resume_name: queryRes.rows[0].resume_name,
      jd_title: queryRes.rows[0].jd_title,
      style: queryRes.rows[0].style,
    });

    console.log("🧼 Cleaning up test user and cascading deletions...");
    await client.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL DATABASE TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase();
