export function isOptOutKeyword(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return (
    normalized === "STOP" ||
    normalized === "UNSUBSCRIBE" ||
    normalized === "QUIT"
  );
}
