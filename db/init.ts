import { getD1 } from './index';

const statements = [
  `CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY NOT NULL, owner_hash TEXT NOT NULL, status TEXT DEFAULT 'SETUP' NOT NULL, role_title TEXT, candidate_name TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_owner_updated ON applications (owner_hash, updated_at)`,
  `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY NOT NULL, application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE, kind TEXT NOT NULL, source_type TEXT NOT NULL, original_name TEXT, mime_type TEXT, normalized_text TEXT NOT NULL, char_count INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_application_kind ON documents (application_id, kind)`,
  `CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY NOT NULL, application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE, role_json TEXT NOT NULL, candidate_json TEXT NOT NULL, job_fit_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_application ON analyses (application_id)`,
  `CREATE TABLE IF NOT EXISTS interview_sessions (id TEXT PRIMARY KEY NOT NULL, application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE, state TEXT NOT NULL, current_level TEXT NOT NULL, difficulty INTEGER DEFAULT 1 NOT NULL, coverage_json TEXT DEFAULT '[]' NOT NULL, question_count INTEGER DEFAULT 0 NOT NULL, started_at INTEGER NOT NULL, completed_at INTEGER, updated_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_sessions_application ON interview_sessions (application_id)`,
  `CREATE TABLE IF NOT EXISTS interview_questions (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE, sequence INTEGER NOT NULL, level TEXT NOT NULL, difficulty INTEGER NOT NULL, question TEXT NOT NULL, competency_keys_json TEXT NOT NULL, primary_topic TEXT NOT NULL, intent TEXT NOT NULL, expected_evidence_json TEXT NOT NULL, is_follow_up INTEGER DEFAULT 0 NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_session_sequence ON interview_questions (session_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS idx_questions_session ON interview_questions (session_id)`,
  `CREATE TABLE IF NOT EXISTS interview_answers (id TEXT PRIMARY KEY NOT NULL, question_id TEXT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE, client_submission_id TEXT NOT NULL, transcript TEXT NOT NULL, input_mode TEXT NOT NULL, duration_ms INTEGER, word_count INTEGER NOT NULL, filler_count INTEGER DEFAULT 0 NOT NULL, submitted_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_question ON interview_answers (question_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_submission ON interview_answers (client_submission_id)`,
  `CREATE TABLE IF NOT EXISTS answer_evaluations (id TEXT PRIMARY KEY NOT NULL, answer_id TEXT NOT NULL REFERENCES interview_answers(id) ON DELETE CASCADE, evaluation_json TEXT NOT NULL, composite_score INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_answer ON answer_evaluations (answer_id)`,
  `CREATE TABLE IF NOT EXISTS interview_reports (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE, overall_score INTEGER NOT NULL, readiness_score INTEGER NOT NULL, readiness_label TEXT NOT NULL, competency_json TEXT NOT NULL, narrative_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_session ON interview_reports (session_id)`,
];

let initialized: Promise<void> | null = null;

export function ensureDatabase() {
  initialized ??= (async () => {
    const d1 = getD1();
    await d1.batch(statements.map((statement) => d1.prepare(statement)));
    await d1.prepare('PRAGMA optimize').run();
  })();
  return initialized;
}
