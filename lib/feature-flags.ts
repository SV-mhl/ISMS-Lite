// Pilot feature flags. Keep additions here narrow and named after the
// process slug they gate, so disabling a pilot is a single-line revert.

// URL check-in pilot (started 2026-09-25 on Y08, extended 2026-09-25 to
// Y09, extended 2026-10-09 to all remaining processes except Y01): allow
// checking in a document that is a URL link instead of an uploaded file,
// for the listed processes only.
export const URL_CHECKIN_PROCESS_SLUGS = new Set([
  "y02", "y03", "y04", "y05a", "y05b", "y06", "y07", "y08", "y09",
  "y10", "y11", "y12", "y13", "y14", "y15", "y16", "y17",
]);

export function isUrlCheckinEnabled(slug: string): boolean {
  return URL_CHECKIN_PROCESS_SLUGS.has(slug);
}
