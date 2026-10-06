import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appOrigin, enabledProviders, oauthClient, type OAuthProvider } from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { upsertOAuthUser } from "@/lib/db/users";
import { safeNext } from "@/lib/utils/safe-next";

type Context = { params: Promise<{ provider: string }> };

type Claims = {
  sub?: string;
  oid?: string;
  email?: string;
  preferred_username?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

/** Finish Google or Microsoft sign-in: check state, exchange the code, find or create the account. */
export async function GET(request: Request, { params }: Context) {
  const { provider } = await params;
  const origin = appOrigin(request);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  if ((provider !== "google" && provider !== "microsoft") || !enabledProviders()[provider as OAuthProvider]) return fail("provider");

  const url = new URL(request.url);
  const store = await cookies();
  const state = store.get("oauth_state")?.value;
  const verifier = store.get("oauth_verifier")?.value;
  const next = safeNext(store.get("oauth_next")?.value);
  for (const name of ["oauth_state", "oauth_verifier", "oauth_next"]) store.delete(name);

  const code = url.searchParams.get("code");
  if (!code || !state || !verifier || url.searchParams.get("state") !== state) return fail("link");

  try {
    const tokens = await oauthClient(provider, origin).validateAuthorizationCode(code, verifier);
    // The ID token comes straight from the provider's token endpoint over TLS.
    const claims = decodeIdToken(tokens.idToken()) as Claims;
    const email = (claims.email || (provider === "microsoft" ? claims.preferred_username : "") || "").trim().toLowerCase();
    const providerUserId = (provider === "microsoft" ? claims.oid || claims.sub : claims.sub) ?? "";
    if (!email.includes("@") || !providerUserId) return fail("email");

    const result = await upsertOAuthUser({
      provider,
      providerUserId,
      email,
      // Google says whether the address is verified; Microsoft doesn't, so its
      // accounts never take over an existing account with the same email.
      emailVerified: provider === "google" ? claims.email_verified === true : false,
      name: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
    });
    if ("error" in result) return fail("exists");
    await createSession(result.user.id);
    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error("[auth] oauth callback failed", { provider, error });
    return fail("link");
  }
}
