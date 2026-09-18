/** One app-wide voice-message owner, with tickets to cancel stale async starts. */
let serial = 0;
let active: { owner: symbol; ticket: number; stop: () => void } | null = null;

export function claimVoicePlayback(owner: symbol, stop: () => void) {
  const previous = active;
  active = null;
  if (previous && previous.owner !== owner) previous.stop();
  const ticket = ++serial;
  active = { owner, ticket, stop };
  return () => active?.owner === owner && active.ticket === ticket;
}

export function ownsVoicePlayback(owner: symbol) { return active?.owner === owner; }

export function releaseVoicePlayback(owner: symbol) {
  if (active?.owner === owner) active = null;
}

export function stopVoicePlayback() {
  const current = active;
  active = null;
  current?.stop();
}