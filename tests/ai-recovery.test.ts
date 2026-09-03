import { describe, expect, it } from 'vitest';
import { classifyAiFailure, retryDelayMs, shouldUseFallback } from '@/lib/ai/recovery';

describe('AI recovery policy', () => {
  it('recognizes provider structured-output failures', () => {
    expect(classifyAiFailure({ status: 400, message: 'Generated JSON does not match the expected schema.' })).toBe('schema');
  });

  it('recognizes rate limits and transient upstream failures', () => {
    expect(classifyAiFailure({ status: 429, message: 'Rate limit reached' })).toBe('rate_limit');
    expect(classifyAiFailure({ status: 503, message: 'Service unavailable' })).toBe('transient');
    expect(classifyAiFailure(new Error('network connection lost'))).toBe('transient');
  });

  it('uses the provider retry delay when available', () => {
    const headers = { get: (name: string) => name === 'retry-after' ? '2' : null };
    expect(retryDelayMs({ status: 429, headers })).toBe(2_150);
  });

  it('falls back only when the model can improve a recoverable request', () => {
    expect(shouldUseFallback('schema', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b')).toBe(true);
    expect(shouldUseFallback('rate_limit', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b')).toBe(false);
    expect(shouldUseFallback('schema', undefined, 'openai/gpt-oss-20b')).toBe(false);
  });
});
