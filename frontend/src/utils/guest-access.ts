/** Local browsing is not authentication and never grants an API identity. */
export const GUEST_BROWSING_KEY = "guest_browsing_v1";

let guestBrowsing = false;

export function setGuestBrowsingMode(enabled: boolean) {
  guestBrowsing = enabled;
}

export function isGuestBrowsingMode() {
  return guestBrowsing;
}

const AUTH_ENTRY_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/guest",
]);

/** Defense in depth; server-side authentication remains unchanged. */
export function assertGuestRequestAllowed(method: string, path: string) {
  if (!guestBrowsing) return;
  if (method === "POST" && AUTH_ENTRY_PATHS.has(path)) return;
  throw new Error("Please log in or create an account to use this feature.");
}

/** Root stack routes that can safely mount while browsing without an account. */
export function canGuestOpenRootRoute(name: string) {
  return ["index", "welcome", "auth", "(tabs)"].includes(name);
}
