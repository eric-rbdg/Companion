/**
 * Rough SMS encoding detection:
 * - GSM-7: basic Latin + common symbols
 * - UCS-2: anything outside GSM-7 (emoji, most non-Latin, many punctuation variants)
 *
 * This is a POC heuristic intended to avoid Twilio Trial segment limits by staying in 1 segment.
 */

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM7_EXTENDED = "^{}\\[~]|€";

function isGsm7Char(ch: string): boolean {
  return GSM7_BASIC.includes(ch) || GSM7_EXTENDED.includes(ch);
}

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!isGsm7Char(ch)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns a conservative per-message character limit for a single SMS segment.
 * - GSM-7: 160 chars
 * - UCS-2: 70 chars
 */
export function singleSegmentCharLimit(text: string): number {
  return isGsm7(text) ? 160 : 70;
}

export function truncateToSingleSegment(text: string): { truncated: string; wasTruncated: boolean } {
  const limit = singleSegmentCharLimit(text);
  if (text.length <= limit) {
    return { truncated: text, wasTruncated: false };
  }

  // Reserve 1 char for ellipsis to make truncation obvious.
  const cut = Math.max(0, limit - 1);
  return { truncated: `${text.slice(0, cut)}…`, wasTruncated: true };
}

