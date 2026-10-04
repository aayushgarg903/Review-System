export function isClientActive(client: { status?: string | null, trial_ends_at?: string | null, paid_until?: string | null } | null | undefined): boolean {
  if (!client) return false;

  const now = new Date();

  if (client.status === "trial") {
    if (client.trial_ends_at) {
      return new Date(client.trial_ends_at) > now;
    }
    return true; // if null, still true
  }

  if (client.status === "active") {
    if (client.paid_until) {
      return new Date(client.paid_until) > now;
    }
    return true; // if null, still true
  }

  return false;
}
