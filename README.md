# ATHENA — AI Interview Accelerator

Athena is a voice-first interview preparation application for candidates targeting a specific job. It reads a job description and resume, measures evidence-backed alignment, conducts a personalised three-level interview, evaluates each answer, and produces an actionable readiness report.

The product is deliberately not a fixed question bank. Each new question is generated only after the previous answer has been evaluated against the role, candidate evidence, competency coverage, interview history, and current difficulty.

## Problem

Generic mock interviews rarely answer the question a candidate actually has: “Am I ready for *this* role?” Athena anchors every stage to the supplied role and resume, probes unsupported claims, and turns demonstrated gaps into a focused preparation plan.

## Complete user flow

1. Paste or upload a PDF, DOCX, or TXT job description.
2. Paste or upload a resume.
3. Review structured role and candidate analyses.
4. Inspect a transparent, weighted Job Fit score.
5. Start the Screening interview.
6. Continue through Competency and Deep Dive levels.
7. Hear each AI-generated question and answer by microphone or keyboard.
8. Review and correct the speech transcript before submission.
9. Receive adaptive follow-ups based on answer quality and coverage.
10. Review interview performance, detailed feedback, preparation priorities, and readiness.

## Product features

- Drag-and-drop and pasted-text document input.
- Server-side PDF, DOCX, and TXT extraction with validation.
- JD-grounded role analysis and resume-to-role comparison.
- Explainable weighted Job Fit, separate from interview performance.
- Explicit, persistent interview state machine.
- Three adaptive interview levels with 9–12 questions total.
- Dynamic difficulty, competency coverage, claim verification, and follow-ups.
- Browser microphone recording and editable OpenAI transcription.
- OpenAI-generated interviewer speech with replay controls.
- Typed-answer accessibility fallback.
- Optional local-only camera preview; no facial or emotion inference.
- Speaking duration, word count, and filler-word signals.
- Evidence-derived competency scores and question-level feedback.
- Prioritised preparation plan and readiness assessment.
- Anonymous D1 persistence so refreshes do not erase progress.

## Architecture

```text
Browser (React 19 + Tailwind + shadcn/ui)
  │
  ├── multipart documents ──► extraction route ──► unpdf / mammoth
  ├── recorded audio ───────► transcription route ──► OpenAI Audio API
  ├── question playback ◄─── speech route ◄──────── OpenAI Audio API
  │
  └── application/interview APIs
          │
          ├── AI service modules ──► OpenAI Responses API + Zod schemas
          ├── deterministic scoring/state logic
          └── Drizzle ORM ──► Cloudflare D1 (SQLite)
```

The UI never receives `OPENAI_API_KEY`. Uploaded bytes and recordings are processed transiently; Athena persists normalized source text, transcripts, evaluation evidence, and scores, not original document or audio blobs.

### Technology stack

- Vinext/Next-compatible App Router, React 19, and TypeScript.
- Tailwind CSS 4, shadcn/ui primitives, Lucide icons, and accessible semantic HTML.
- Cloudflare Sites/Workers runtime.
- Drizzle ORM and Cloudflare D1 (SQLite-compatible).
- OpenAI TypeScript SDK, Responses API Structured Outputs, Audio Transcriptions, and Speech.
- Zod for all AI and request validation.
- `unpdf` for serverless PDF extraction and `mammoth` for DOCX.
- Vitest for deterministic unit tests and Oxlint for linting.

## Folder structure

```text
app/
  api/                         # document, analysis, interview, STT, and TTS routes
  applications/[id]/           # analysis, interview, and results screens
components/                    # product surfaces and shadcn primitives
db/                            # Drizzle schema, D1 access, runtime initialization
drizzle/                       # generated SQL migrations
lib/
  ai/                          # role, candidate, question, evaluation, report modules
  interview/                   # deterministic interview state machine
  server/                      # ownership, errors, application loading
  documents.ts                 # extraction and normalization
  scoring.ts                   # Job Fit, interview, readiness formulas
tests/                         # scoring, state-machine, and document tests
```

## AI and LLM approach

Every AI operation has a small, single-purpose module and a strict Zod response schema. Model calls run server-side, use Structured Outputs, disable OpenAI response storage, and retry once on malformed or transient failure. There are no hidden hardcoded candidate examples and no fabricated fallback analyses.

### Role analysis

The role analyst extracts only JD-supported title, responsibilities, required/preferred skills, technical and behavioural competencies, experience expectations, concepts, keywords, and qualifications. Importance reflects explicit wording and repetition.

### Candidate analysis

The candidate analyst receives the resume, original JD, and structured role. It must map every meaningful requirement to `strong`, `partial`, or `missing` with evidence. Missing evidence explicitly says it was not demonstrated. Metrics, scale, ownership, and ambiguous depth become interview claims to verify.

### Dynamic questioning

Athena generates only the initial question when a session starts. After every submitted answer it:

1. Evaluates the answer into relevance, correctness, depth, reasoning, clarity, communication, completeness, confidence, role alignment, and behavioural evidence.
2. Extracts strengths, weaknesses, claims, inconsistencies, and a follow-up direction.
3. Updates competency coverage and difficulty.
4. Decides whether to follow up, cover an unmet competency, or transition level.
5. Generates exactly one next question with the complete grounded context.

Screening tests motivation, ownership, communication, and basic fit. Competency adds applied technical and behavioural scenarios. Deep Dive challenges vague answers, metrics, trade-offs, edge cases, and inconsistencies.

### Interview progression

The application state machine is:

```text
SETUP → ROLE_ANALYSIS → CANDIDATE_ANALYSIS → READY
      → SCREENING → COMPETENCY → DEEP_DIVE
      → EVALUATING → COMPLETED
```

Each level asks at least three and at most four questions. Athena moves after the minimum only when target coverage is sufficient; the fourth question closes the most important remaining gap. Difficulty is bounded by level and rises after strong answers or drops to isolate fundamentals after weak answers.

## Scoring methodology

### Job Fit

Job Fit is calculated in application code, not accepted as one raw model number.

| Category | Weight |
| --- | ---: |
| Required skills | 30% |
| Technical competencies | 20% |
| Relevant experience | 20% |
| Preferred skills | 10% |
| Behavioural competencies | 10% |
| Qualifications | 10% |

Each mapped requirement contributes `1.0` for strong evidence, `0.5` for partial evidence, and `0` when missing. Category scores are normalized before applying weights.

### Interview performance

Stored answer evaluations are aggregated with level multipliers: Screening `0.8`, Competency `1.0`, and Deep Dive `1.2`.

| Competency | Weight |
| --- | ---: |
| Technical knowledge | 25% |
| Problem solving | 20% |
| Role fit | 15% |
| Communication | 15% |
| Depth of understanding | 10% |
| Behavioural fit | 10% |
| Evidence-based confidence | 5% |

### Readiness

Readiness begins with `65% interview performance + 35% Job Fit`. Athena then subtracts up to 15 points for critical required skills that remain unsupported.

- `0–49`: Not Ready
- `50–69`: Needs Preparation
- `70–84`: Interview Ready
- `85–100`: Strong Candidate

## Voice implementation

The browser records supported Opus/WebM or MP4 audio through `MediaRecorder`, displays permission and compatibility errors, and automatically sends the completed blob to the server-only transcription endpoint. The candidate can edit the transcript before submitting it. Each new question is synthesized by `gpt-4o-mini-tts` using the `cedar` voice and can be replayed. The interface clearly discloses that Athena’s voice is AI-generated.

Voice remains primary; keyboard input is an accessibility and failure fallback. Camera preview is optional and local to the browser.

## Local setup

Requirements: Node.js 22.13 or later and an OpenAI API key with access to the configured models.

```bash
npm install
cp .env.example .env
```

Set your secret in `.env`:

```dotenv
OPENAI_API_KEY=your_key_here
```

Then run:

```bash
npm run dev
```

Open the exact local URL printed by Vinext. D1 local state is stored by Wrangler under the ignored project cache.

### Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run db:generate
npm run build
```

## Deployment

Athena is configured for Cloudflare Sites with logical D1 binding `DB` in `.openai/hosting.json`.

1. Authenticate the Sites/Cloudflare deployment tooling.
2. Create or connect the hosted D1 database through Sites.
3. Add `OPENAI_API_KEY` as a hosted runtime secret, never a client variable.
4. Optionally set `OPENAI_TEXT_MODEL` and canonical `SITE_URL`.
5. Deploy the generated production build through Sites.
6. Run a real JD/resume/voice smoke test against the deployed HTTPS origin.

The committed Drizzle migration creates all required tables and indexes.

## Privacy and robustness

- Anonymous ownership uses a 30-day opaque HTTP-only cookie; only its SHA-256 hash is stored.
- Accepted documents: PDF, DOCX, TXT; maximum 5 MB and 50,000 normalized characters each.
- Recordings are limited to 10 MB and are not stored after transcription.
- Duplicate answers are rejected by both question and client-submission uniqueness.
- Invalid state transitions, empty documents/audio, malformed AI output, unsupported browsers, permission denials, and upstream failures return safe errors without stack traces or secrets.

## Known limitations

- No account authentication, multi-device synchronization, or deletion console in this prototype.
- English is the optimized interview and speech language.
- Scanned/image-only PDFs require OCR before upload.
- The interview is sequential rather than low-latency realtime duplex audio.
- A live OpenAI smoke test requires the deployer’s API key and incurs API usage.
- Camera video is preview-only and intentionally excluded from scoring.

## Demo-video walkthrough

1. Open the dashboard and show both paste and upload choices.
2. Upload a JD and resume, then start analysis.
3. Explain the role cards and transparent Job Fit categories.
4. Point out resume evidence, gaps, and claims Athena plans to verify.
5. Start the interview and hear Athena ask the personalized first question.
6. Record an answer, stop, review/correct the transcript, and submit.
7. Show a personalized follow-up and the Screening → Competency → Deep Dive progression.
8. Give one intentionally vague answer so Athena probes it.
9. Complete the interview and open the results dashboard.
10. Explain the separate Job Fit, interview, and readiness scores.
11. Expand question-level feedback and finish on the prioritized preparation plan.

## Future improvements

Realtime streaming transcription, authenticated interview history, follow-up interviews based on prior results, coding exercises, shareable reports with consent controls, PostgreSQL migration for account-scale workloads, multilingual interviewing, and recruiter/team workflows.
