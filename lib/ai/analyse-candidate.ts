import type { RoleAnalysis } from './schemas';
import { candidateAnalysisSchema } from './schemas';
import { structuredResponse } from './client';

export function analyseCandidate(resume: string, jobDescription: string, role: RoleAnalysis) {
  return structuredResponse(
    'candidate_analysis',
    candidateAnalysisSchema,
    `You are Athena's evidence-focused candidate analyst. Compare the resume directly with every meaningful role requirement. Never claim experience or skills absent from the resume. For each requirement, create a requirementMatches item and classify it strong, partial, or missing with concise evidence. Missing evidence must explicitly say it was not demonstrated. Claims to verify should be specific metrics, ownership claims, scale claims, or ambiguous technology depth worth probing in an interview.`,
    `STRUCTURED ROLE\n${JSON.stringify(role)}\n\nJOB DESCRIPTION\n${jobDescription}\n\nCANDIDATE RESUME\n${resume}`,
  );
}
