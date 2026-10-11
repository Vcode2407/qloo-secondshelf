declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    QLOO_API_KEY?: string;
    SECONDSHELF_STATE_SECRET?: string;
  }
}
