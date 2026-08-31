CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`role_json` text NOT NULL,
	`candidate_json` text NOT NULL,
	`job_fit_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_analyses_application` ON `analyses` (`application_id`);--> statement-breakpoint
CREATE TABLE `answer_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`evaluation_json` text NOT NULL,
	`composite_score` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `interview_answers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evaluations_answer` ON `answer_evaluations` (`answer_id`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`status` text DEFAULT 'SETUP' NOT NULL,
	`role_title` text,
	`candidate_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_applications_owner_updated` ON `applications` (`owner_hash`,`updated_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`kind` text NOT NULL,
	`source_type` text NOT NULL,
	`original_name` text,
	`mime_type` text,
	`normalized_text` text NOT NULL,
	`char_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_documents_application_kind` ON `documents` (`application_id`,`kind`);--> statement-breakpoint
CREATE TABLE `interview_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`client_submission_id` text NOT NULL,
	`transcript` text NOT NULL,
	`input_mode` text NOT NULL,
	`duration_ms` integer,
	`word_count` integer NOT NULL,
	`filler_count` integer DEFAULT 0 NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `interview_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_answers_question` ON `interview_answers` (`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_answers_submission` ON `interview_answers` (`client_submission_id`);--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`level` text NOT NULL,
	`difficulty` integer NOT NULL,
	`question` text NOT NULL,
	`competency_keys_json` text NOT NULL,
	`primary_topic` text NOT NULL,
	`intent` text NOT NULL,
	`expected_evidence_json` text NOT NULL,
	`is_follow_up` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_questions_session_sequence` ON `interview_questions` (`session_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_questions_session` ON `interview_questions` (`session_id`);--> statement-breakpoint
CREATE TABLE `interview_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`overall_score` integer NOT NULL,
	`readiness_score` integer NOT NULL,
	`readiness_label` text NOT NULL,
	`competency_json` text NOT NULL,
	`narrative_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_session` ON `interview_reports` (`session_id`);--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`state` text NOT NULL,
	`current_level` text NOT NULL,
	`difficulty` integer DEFAULT 1 NOT NULL,
	`coverage_json` text DEFAULT '[]' NOT NULL,
	`question_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interview_sessions_application` ON `interview_sessions` (`application_id`);