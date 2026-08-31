import { roleAnalysisSchema } from './schemas';
import { structuredResponse } from './client';

export function analyseRole(jobDescription: string) {
  return structuredResponse(
    'role_analysis',
    roleAnalysisSchema,
    `You are Athena's role analyst. Extract only information supported by the supplied job description. Do not invent technologies, requirements, seniority, or qualifications. Keep lists concise, deduplicated, and interview-relevant. Mark importance based on explicit wording and repetition.`,
    `JOB DESCRIPTION\n---\n${jobDescription}`,
  );
}
