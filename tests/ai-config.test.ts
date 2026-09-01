import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GROQ_STT_MODEL,
  DEFAULT_GROQ_TEXT_MODEL,
  DEFAULT_GROQ_TTS_MODEL,
  DEFAULT_GROQ_TTS_VOICE,
  GROQ_BASE_URL,
  resolveGroqConfig,
} from '@/lib/ai/config';

describe('Groq configuration', () => {
  it('uses safe production defaults and the fixed Groq origin', () => {
    expect(resolveGroqConfig()).toEqual({
      apiKey: undefined,
      baseURL: GROQ_BASE_URL,
      textModel: DEFAULT_GROQ_TEXT_MODEL,
      transcriptionModel: DEFAULT_GROQ_STT_MODEL,
      speechModel: DEFAULT_GROQ_TTS_MODEL,
      speechVoice: DEFAULT_GROQ_TTS_VOICE,
    });
  });

  it('prefers Cloudflare bindings over process environment values', () => {
    const config = resolveGroqConfig(
      { GROQ_API_KEY: 'binding-key', GROQ_TEXT_MODEL: 'binding-model', GROQ_TTS_VOICE: 'hannah' },
      { GROQ_API_KEY: 'process-key', GROQ_TEXT_MODEL: 'process-model' },
    );

    expect(config.apiKey).toBe('binding-key');
    expect(config.textModel).toBe('binding-model');
    expect(config.speechVoice).toBe('hannah');
  });

  it('supports the existing private local key name during migration', () => {
    const config = resolveGroqConfig({}, { OPENAI_API_KEY: 'legacy-local-key', OPENAI_TEXT_MODEL: 'openai/gpt-oss-20b' });
    expect(config.apiKey).toBe('legacy-local-key');
    expect(config.textModel).toBe('openai/gpt-oss-20b');
    expect(config.baseURL).toBe('https://api.groq.com/openai/v1');
  });
});
