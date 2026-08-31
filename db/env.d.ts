declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    OPENAI_API_KEY?: string;
    OPENAI_TEXT_MODEL?: string;
    SITE_URL?: string;
  }
}
