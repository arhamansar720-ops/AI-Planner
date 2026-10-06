import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appOrigin, enabledProviders, OAUTH_SCOPES, oauthClient, type OAuthProvider } from "@/lib/auth/oauth";
import { safeNext } from "@/lib/utils/safe-next";

type Context = { params: Promise<{ provider: string }> };

/** Start Google or Microsoft sign-in (PKCE + state, kept in short-lived cookies). */
export async function GET(request: Request, { params }: Context) {
  const { provider } = await params;
  const origin = appOrigin(request);
  if (provider !== "google" && provider !== "microsoft") return NextResponse.redirect(new URL("/login", origin));
  if (!enabledProviders()[provider as OAuthProvider]) return NextResponse.redirect(new URL("/login?error=provider", origin));

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = oauthClient(provider, origin).createAuthorizationURL(state, verifier, OAUTH_SCOPES[provider]);
  if (provider === "google") url.searchParams.set("prompt", "select_account");

  const store = await cookies();
  const options = { httpOnly: true, sameSite: "lax" as const, secure: origin.startsWith("https://"), path: "/", maxAge: 600 };
  store.set("oauth_state", state, options);
  store.set("oauth_verifier", verifier, options);
  store.set("oauth_next", safeNext(new URL(request.url).searchParams.get("next")), options);
  return NextResponse.redirect(url);
}
