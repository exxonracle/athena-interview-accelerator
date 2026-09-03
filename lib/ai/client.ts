import { env } from 'cloudflare:workers';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ZodType } from 'zod';
import { AppError } from '@/lib/server/errors';
import { resolveGroqConfig, type GroqEnvironment } from './config';
import { classifyAiFailure, retryDelayMs, shouldUseFallback } from './recovery';

const bindings = env as unknown as GroqEnvironment;

export function getGroqConfig() {
  const processEnvironment = typeof process === 'undefined' ? {} : process.env as GroqEnvironment;
  return resolveGroqConfig(bindings, processEnvironment);
}

function getClient() {
  const config = getGroqConfig();
  if (!config.apiKey) throw new AppError(503, 'AI is not configured. Add GROQ_API_KEY to continue.', 'AI_NOT_CONFIGURED');
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 20_000, maxRetries: 0 });
}

export async function structuredResponse<T>(
  name: string,
  schema: ZodType<T>,
  instructions: string,
  input: string,
  options: { model?: string; fallbackModel?: string; maxOutputTokens?: number } = {},
): Promise<T> {
  let lastError: unknown;
  const primaryModel = options.model || getGroqConfig().textModel;
  let activeModel = primaryModel;
  let retries = 0;
  let usedFallback = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const client = getClient();
      const response = await client.responses.parse({
        model: activeModel,
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
      const kind = classifyAiFailure(error);
      const upstream = error as { status?: number; message?: string } | null;
      console.warn('Athena AI attempt failed', { operation: name, attempt: attempt + 1, model: activeModel, kind, status: upstream?.status ?? null, message: upstream?.message?.slice(0, 180) ?? null });

      if (!usedFallback && shouldUseFallback(kind, options.fallbackModel, activeModel)) {
        activeModel = options.fallbackModel!;
        usedFallback = true;
        continue;
      }
      const canRetry = (kind === 'rate_limit' || kind === 'transient' || (kind === 'schema' && !options.fallbackModel)) && retries < 1;
      if (canRetry) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(error, retries)));
        retries += 1;
        continue;
      }
      break;
    }
  }
  console.error(`Groq ${name} failed`, lastError instanceof Error ? lastError.message : lastError);
  const kind = classifyAiFailure(lastError);
  if (kind === 'rate_limit') {
    throw new AppError(429, 'Athena is briefly rate-limited. Wait a few seconds, then submit your answer again.', 'AI_RATE_LIMITED');
  }
  if (kind === 'configuration') throw new AppError(503, 'Athena AI is not available right now. Check the server configuration and try again.', 'AI_NOT_CONFIGURED');
  throw new AppError(502, 'Athena could not validate this AI step after recovering automatically. Your work is safe—please retry.', 'AI_RESPONSE_FAILED');
}

export function groqClient() {
  return getClient();
}
