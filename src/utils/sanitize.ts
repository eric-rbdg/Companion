/**
 * Strip script tags and HTML from inbound SMS before sending to the AI.
 */
export function sanitizeSmsContent(input: string): string {
  const withoutScripts = input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  return withoutScripts.replace(/<[^>]+>/g, "").trim();
}
