import { env } from 'cloudflare:workers';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ZodType } from 'zod';
import { AppError } from '@/lib/server/errors';
import { resolveGroqConfig, type GroqEnvironment } from './config';

const bindings = env as unknown as GroqEnvironment;

export function getGroqConfig() {
  const processEnvironment = typeof process === 'undefined' ? {} : process.env as GroqEnvironment;
  return resolveGroqConfig(bindings, processEnvironment);
}

function getClient() {
  const config = getGroqConfig();
  if (!config.apiKey) throw new AppError(503, 'AI is not configured. Add GROQ_API_KEY to continue.', 'AI_NOT_CONFIGURED');
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
}

export async function structuredResponse<T>(name: string, schema: ZodType<T>, instructions: string, input: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const client = getClient();
      const response = await client.responses.parse({
        model: getGroqConfig().textModel,
        instructions,
        input,
        text: { format: zodTextFormat(schema, name) },
        reasoning: { effort: 'low' },
      });
      if (!response.output_parsed) throw new Error('Model returned no structured output');
      return schema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_NOT_CONFIGURED') throw error;
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  console.error(`Groq ${name} failed`, lastError instanceof Error ? lastError.message : lastError);
  throw new AppError(502, 'Athena could not complete this AI step. Please retry in a moment.', 'AI_RESPONSE_FAILED');
}

export function groqClient() {
  return getClient();
}
