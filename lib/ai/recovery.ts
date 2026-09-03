export type AiFailureKind = 'schema' | 'rate_limit' | 'transient' | 'configuration' | 'request';

type UpstreamError = {
  status?: number;
  message?: string;
  name?: string;
  headers?: { get?: (name: string) => string | null };
};

function upstreamError(error: unknown) {
  return (error && typeof error === 'object' ? error : {}) as UpstreamError;
}

export function classifyAiFailure(error: unknown): AiFailureKind {
  const upstream = upstreamError(error);
  const message = `${upstream.name || ''} ${upstream.message || ''}`.toLowerCase();
  if (upstream.status === 429) return 'rate_limit';
  if (upstream.status === 401 || upstream.status === 403) return 'configuration';
  if (upstream.status === 408 || upstream.status === 504 || /timeout|timed out|network connection|fetch failed|econnreset|socket/.test(message)) return 'transient';
  if (upstream.status && upstream.status >= 500) return 'transient';
  if (/generated json|expected schema|output_parsed|structured output|jsonschema|does not validate|invalid json/.test(message)) return 'schema';
  if (upstream.status === 400 || upstream.status === 404 || upstream.status === 422) return 'request';
  return 'transient';
}

export function retryDelayMs(error: unknown, retryIndex = 0) {
  const upstream = upstreamError(error);
  if (classifyAiFailure(error) === 'rate_limit') {
    const retryAfter = Number(upstream.headers?.get?.('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(8_000, Math.ceil(retryAfter * 1_000) + 150);
    const messageDelay = upstream.message?.match(/try again in ([\d.]+)s/i)?.[1];
    if (messageDelay) return Math.min(8_000, Math.ceil(Number(messageDelay) * 1_000) + 150);
    return 1_500;
  }
  return retryIndex === 0 ? 600 : 1_500;
}

export function shouldUseFallback(kind: AiFailureKind, fallbackModel: string | undefined, activeModel: string) {
  return Boolean(fallbackModel && fallbackModel !== activeModel && (kind === 'schema' || kind === 'transient'));
}
