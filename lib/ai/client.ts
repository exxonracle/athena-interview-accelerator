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

function retryDelayMs(error: unknown) {
  const upstream = error as { status?: number; headers?: { get?: (name: string) => string | null }; message?: string } | null;
  if (upstream?.status !== 429) return 350;
  const retryAfter = Number(upstream.headers?.get?.('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(10_000, Math.ceil(retryAfter * 1_000) + 150);
  const messageDelay = upstream.message?.match(/try again in ([\d.]+)s/i)?.[1];
  return messageDelay ? Math.min(10_000, Math.ceil(Number(messageDelay) * 1_000) + 150) : 2_000;
}

export async function structuredResponse<T>(
  name: string,
  schema: ZodType<T>,
  instructions: string,
  input: string,
  options: { model?: string; maxOutputTokens?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const client = getClient();
      const response = await client.responses.parse({
        model: options.model || getGroqConfig().textModel,
        instructions,
        input,
        text: { format: zodTextFormat(schema, name) },
        reasoning: { effort: 'low' },
        max_output_tokens: options.maxOutputTokens,
      });
      if (!response.output_parsed) throw new Error('Model returned no structured output');
      return schema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_NOT_CONFIGURED') throw error;
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs(error)));
    }
  }
  console.error(`Groq ${name} failed`, lastError instanceof Error ? lastError.message : lastError);
  throw new AppError(502, 'Athena could not complete this AI step. Please retry in a moment.', 'AI_RESPONSE_FAILED');
}

export function groqClient() {
  return getClient();
}
