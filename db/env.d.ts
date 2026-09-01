declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GROQ_API_KEY?: string;
    GROQ_TEXT_MODEL?: string;
    GROQ_STT_MODEL?: string;
    GROQ_TTS_MODEL?: string;
    GROQ_TTS_VOICE?: string;
    SITE_URL?: string;
  }
}
