import type { ConversationMessage } from "../types/index.js";

/** ~15k tokens POC estimate: 4 chars per token */
const MAX_HISTORY_CHARS = 15_000 * 4;

/**
 * Trim oldest messages until total character budget fits Claude context (simple POC heuristic).
 */
export function trimMessagesForContext(
  chronological: ConversationMessage[],
): ConversationMessage[] {
  let total = 0;
  const result: ConversationMessage[] = [];

  for (let i = chronological.length - 1; i >= 0; i--) {
    const msg = chronological[i]!;
    const len = msg.content.length;
    if (total + len > MAX_HISTORY_CHARS && result.length > 0) {
      break;
    }
    total += len;
    result.push(msg);
  }

  return result.reverse();
}
