import { env } from 'cloudflare:workers';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ZodType } from 'zod';
import { AppError } from '@/lib/server/errors';

const bindings = env as unknown as { OPENAI_API_KEY?: string; OPENAI_TEXT_MODEL?: string };
export const TEXT_MODEL = bindings.OPENAI_TEXT_MODEL || 'gpt-5.6-terra';

function getClient() {
  const apiKey = bindings.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError(503, 'OpenAI is not configured. Add OPENAI_API_KEY to continue.', 'AI_NOT_CONFIGURED');
  return new OpenAI({ apiKey });
}

export async function structuredResponse<T>(name: string, schema: ZodType<T>, instructions: string, input: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await getClient().responses.parse({
        model: TEXT_MODEL,
        instructions,
        input,
        text: { format: zodTextFormat(schema, name) },
        reasoning: { effort: 'low' },
        store: false,
      });
      if (!response.output_parsed) throw new Error('Model returned no structured output');
      return schema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_NOT_CONFIGURED') throw error;
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  console.error(`OpenAI ${name} failed`, lastError instanceof Error ? lastError.message : lastError);
  throw new AppError(502, 'Athena could not complete this AI step. Please retry in a moment.', 'AI_RESPONSE_FAILED');
}

export function openAIClient() {
  return getClient();
}
