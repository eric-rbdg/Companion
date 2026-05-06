/**
 * Twilio validateRequest expects string values; normalize Express parsed body.
 */
export function twilioBodyToStringRecord(
  body: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string") {
        out[key] = first;
      }
    }
  }
  return out;
}
