import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  ownerHash: text('owner_hash').notNull(),
  status: text('status').notNull().default('SETUP'),
  roleTitle: text('role_title'),
  candidateName: text('candidate_name'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_applications_owner_updated').on(table.ownerHash, table.updatedAt)]);

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  sourceType: text('source_type').notNull(),
  originalName: text('original_name'),
  mimeType: text('mime_type'),
  normalizedText: text('normalized_text').notNull(),
  charCount: integer('char_count').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_documents_application_kind').on(table.applicationId, table.kind)]);

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  roleJson: text('role_json').notNull(),
  candidateJson: text('candidate_json').notNull(),
  jobFitJson: text('job_fit_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_analyses_application').on(table.applicationId)]);

export const interviewSessions = sqliteTable('interview_sessions', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  state: text('state').notNull(),
  currentLevel: text('current_level').notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  coverageJson: text('coverage_json').notNull().default('[]'),
  questionCount: integer('question_count').notNull().default(0),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_interview_sessions_application').on(table.applicationId)]);

export const interviewQuestions = sqliteTable('interview_questions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => interviewSessions.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  level: text('level').notNull(),
  difficulty: integer('difficulty').notNull(),
  question: text('question').notNull(),
  competencyKeysJson: text('competency_keys_json').notNull(),
  primaryTopic: text('primary_topic').notNull(),
  intent: text('intent').notNull(),
  expectedEvidenceJson: text('expected_evidence_json').notNull(),
  isFollowUp: integer('is_follow_up', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_questions_session_sequence').on(table.sessionId, table.sequence),
  index('idx_questions_session').on(table.sessionId),
]);

export const interviewAnswers = sqliteTable('interview_answers', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => interviewQuestions.id, { onDelete: 'cascade' }),
  clientSubmissionId: text('client_submission_id').notNull(),
  transcript: text('transcript').notNull(),
  inputMode: text('input_mode').notNull(),
  durationMs: integer('duration_ms'),
  wordCount: integer('word_count').notNull(),
  fillerCount: integer('filler_count').notNull().default(0),
  submittedAt: integer('submitted_at').notNull(),
}, (table) => [
  uniqueIndex('idx_answers_question').on(table.questionId),
  uniqueIndex('idx_answers_submission').on(table.clientSubmissionId),
]);

export const answerEvaluations = sqliteTable('answer_evaluations', {
  id: text('id').primaryKey(),
  answerId: text('answer_id').notNull().references(() => interviewAnswers.id, { onDelete: 'cascade' }),
  evaluationJson: text('evaluation_json').notNull(),
  compositeScore: integer('composite_score').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_evaluations_answer').on(table.answerId)]);

export const interviewReports = sqliteTable('interview_reports', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => interviewSessions.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score').notNull(),
  readinessScore: integer('readiness_score').notNull(),
  readinessLabel: text('readiness_label').notNull(),
  competencyJson: text('competency_json').notNull(),
  narrativeJson: text('narrative_json').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_reports_session').on(table.sessionId)]);
