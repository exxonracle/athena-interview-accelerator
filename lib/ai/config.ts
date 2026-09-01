export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_GROQ_STT_MODEL = 'whisper-large-v3-turbo';
export const DEFAULT_GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english';
export const DEFAULT_GROQ_TTS_VOICE = 'troy';

export type GroqEnvironment = {
  GROQ_API_KEY?: string;
  GROQ_TEXT_MODEL?: string;
  GROQ_STT_MODEL?: string;
  GROQ_TTS_MODEL?: string;
  GROQ_TTS_VOICE?: string;
  /** Temporary compatibility for an existing local environment created before the Groq migration. */
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
};

export function resolveGroqConfig(bindings: GroqEnvironment = {}, processEnvironment: GroqEnvironment = {}) {
  return {
    apiKey: bindings.GROQ_API_KEY || processEnvironment.GROQ_API_KEY || bindings.OPENAI_API_KEY || processEnvironment.OPENAI_API_KEY,
    baseURL: GROQ_BASE_URL,
    textModel: bindings.GROQ_TEXT_MODEL || processEnvironment.GROQ_TEXT_MODEL || bindings.OPENAI_TEXT_MODEL || processEnvironment.OPENAI_TEXT_MODEL || DEFAULT_GROQ_TEXT_MODEL,
    transcriptionModel: bindings.GROQ_STT_MODEL || processEnvironment.GROQ_STT_MODEL || DEFAULT_GROQ_STT_MODEL,
    speechModel: bindings.GROQ_TTS_MODEL || processEnvironment.GROQ_TTS_MODEL || DEFAULT_GROQ_TTS_MODEL,
    speechVoice: bindings.GROQ_TTS_VOICE || processEnvironment.GROQ_TTS_VOICE || DEFAULT_GROQ_TTS_VOICE,
  };
}
