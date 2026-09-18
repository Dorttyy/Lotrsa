/** Only our own internal routes are accepted from notification payloads. */
export function notificationTarget(data: Record<string, unknown>): string {
  const raw = data.action_url;
  if (typeof raw === "string" && /^\/(chat|moment|user)\/[\w-]+$/.test(raw)) return raw;
  if (typeof raw === "string" && /^\/incoming-call\?call_id=[\w-]+$/.test(raw)) return raw;
  if (data.type === "incoming_call" && typeof data.call_id === "string" && /^[\w-]+$/.test(data.call_id)) return `/incoming-call?call_id=${data.call_id}`;
  if (typeof data.conversation_id === "string" && /^[\w-]+$/.test(data.conversation_id)) return `/chat/${data.conversation_id}`;
  if (typeof data.moment_id === "string" && /^[\w-]+$/.test(data.moment_id)) return `/moment/${data.moment_id}`;
  return "/notifications";
}