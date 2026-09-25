// Pilot feature flags. Keep additions here narrow and named after the
// process slug they gate, so disabling a pilot is a single-line revert.

// URL check-in pilot (2026-09-25): allow checking in a document that is a
// URL link instead of an uploaded file, for a single process only.
export const URL_CHECKIN_PROCESS_SLUGS = new Set(["y08"]);

export function isUrlCheckinEnabled(slug: string): boolean {
  return URL_CHECKIN_PROCESS_SLUGS.has(slug);
}
