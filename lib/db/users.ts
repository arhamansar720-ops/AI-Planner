import "server-only";
import type { StoredConnection } from "@/lib/connections/providers";
import { getPersona, type PersonaId } from "@/lib/personas";
import { query } from "./pool";

/** The signed-in account, as the app uses it. */
export type AppUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  persona: PersonaId | null;
  onboardedAt: string | null;
  connections: StoredConnection[];
  hasPassword: boolean;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  avatar_url: string | null;
  persona: string | null;
  onboarded_at: string | null;
  connections: StoredConnection[] | null;
};

export const USER_COLUMNS = "u.id, u.email, u.password_hash, u.display_name, u.avatar_url, u.persona, u.onboarded_at, u.connections";

export function rowToUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name || row.email.split("@")[0] || "You",
    avatarUrl: row.avatar_url,
    persona: getPersona(row.persona)?.id ?? null,
    onboardedAt: row.onboarded_at,
    connections: Array.isArray(row.connections) ? row.connections : [],
    hasPassword: Boolean(row.password_hash),
  };
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findUserByEmail(email: string): Promise<(AppUser & { passwordHash: string | null }) | null> {
  const { rows } = await query<UserRow>(`select ${USER_COLUMNS} from users u where u.email = $1`, [normalizeEmail(email)]);
  return rows[0] ? { ...rowToUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function createUser(input: { email: string; passwordHash?: string | null; name?: string | null; avatarUrl?: string | null }) {
  const { rows } = await query<UserRow>(
    `insert into users (email, password_hash, display_name, avatar_url) values ($1, $2, $3, $4)
     returning id, email, password_hash, display_name, avatar_url, persona, onboarded_at, connections`,
    [normalizeEmail(input.email), input.passwordHash ?? null, input.name?.trim() || null, input.avatarUrl ?? null],
  );
  return rowToUser(rows[0]);
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; persona: PersonaId | null; onboardedAt: string; connections: StoredConnection[]; passwordHash: string }>,
) {
  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (patch.name !== undefined) add("display_name", patch.name.trim() || null);
  if (patch.persona !== undefined) add("persona", patch.persona);
  if (patch.onboardedAt !== undefined) add("onboarded_at", patch.onboardedAt);
  if (patch.connections !== undefined) add("connections", JSON.stringify(patch.connections));
  if (patch.passwordHash !== undefined) add("password_hash", patch.passwordHash);
  if (!sets.length) return;
  await query(`update users set ${sets.join(", ")}, updated_at = now() where id = $1`, values);
}

/**
 * Find or create the user for a Google/Microsoft identity. An existing
 * account with the same email is linked only when the provider has verified
 * that email, so nobody can claim someone else's account.
 */
export async function upsertOAuthUser(input: {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}): Promise<{ user: AppUser } | { error: "email_taken" }> {
  const linked = await query<UserRow>(
    `select ${USER_COLUMNS} from oauth_accounts a join users u on u.id = a.user_id where a.provider = $1 and a.provider_user_id = $2`,
    [input.provider, input.providerUserId],
  );
  if (linked.rows[0]) return { user: rowToUser(linked.rows[0]) };

  const existing = await findUserByEmail(input.email);
  let user: AppUser;
  if (existing) {
    if (!input.emailVerified) return { error: "email_taken" };
    user = existing;
  } else {
    user = await createUser({ email: input.email, name: input.name, avatarUrl: input.avatarUrl });
  }
  await query(`insert into oauth_accounts (provider, provider_user_id, user_id) values ($1, $2, $3) on conflict do nothing`, [
    input.provider,
    input.providerUserId,
    user.id,
  ]);
  return { user };
}
