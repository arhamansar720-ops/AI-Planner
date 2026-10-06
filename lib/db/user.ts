import "server-only";
import type { NavUser } from "@/components/shell/top-nav";
import type { PersonaId } from "@/lib/personas";
import type { AppUser } from "./users";

export function getNavUser(user: AppUser | null): NavUser {
  return user ? { email: user.email, name: user.name } : null;
}

/** Setup choices for the account. */
export function getAccountSetup(user: AppUser | null): { persona: PersonaId | null; onboarded: boolean } {
  return { persona: user?.persona ?? null, onboarded: Boolean(user?.onboardedAt) };
}
