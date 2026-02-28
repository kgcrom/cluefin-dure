const KNOWN_BROKERS = new Set(["kis", "kiwoom", "krx", "dart"]);
const SESSION_SKIP_PREFIXES = ["ta.", "rpc.", "session.", "test.", "quote.krx."];

export function detectBroker(method: string): string | null {
  for (const prefix of SESSION_SKIP_PREFIXES) {
    if (method.startsWith(prefix)) return null;
  }
  const broker = method.split(".")[0];
  return KNOWN_BROKERS.has(broker) ? broker : null;
}
