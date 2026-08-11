/**
 * Parcel Pulse currently has no persistent data requirements. Keeping this
 * lightweight placeholder avoids a platform-specific Cloudflare D1 import,
 * so the app remains deployable on Vercel as well as the original host.
 */
export function getDb(): never {
  throw new Error("Database access is not configured for Parcel Pulse.");
}
