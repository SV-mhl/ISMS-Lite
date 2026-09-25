// Pilot feature flags. Keep additions here narrow and named after the
// process slug they gate, so disabling a pilot is a single-line revert.

// URL check-in pilot (started 2026-09-25 on Y08, extended 2026-09-25 to
// Y09): allow checking in a document that is a URL link instead of an
// uploaded file, for the listed processes only.
export const URL_CHECKIN_PROCESS_SLUGS = new Set(["y08", "y09"]);

export function isUrlCheckinEnabled(slug: string): boolean {
  return URL_CHECKIN_PROCESS_SLUGS.has(slug);
}
