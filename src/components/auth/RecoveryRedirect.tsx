"use client";

// Supabase only honours a `redirect_to` that is on the project's redirect
// allow-list; anything else silently falls back to the Site URL. That drops
// recovery links on the home page with the one-time tokens still in the URL
// fragment, where nothing handles them — the user ends up back at the login
// screen with no way to set a password.
//
// This runs at module evaluation, before any component mounts and before the
// Supabase browser client can consume the fragment, and forwards the whole
// fragment to the page that knows what to do with it.
if (
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery") &&
  window.location.pathname !== "/reset-password"
) {
  window.location.replace(`/reset-password${window.location.hash}`);
}

export function RecoveryRedirect() {
  return null;
}
