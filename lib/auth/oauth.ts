import "server-only";
import { Google, MicrosoftEntraId } from "arctic";

export type OAuthProvider = "google" | "microsoft";

/** The site's public address, used for OAuth redirects and email links. */
export function appOrigin(request?: Request): string {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (!request) return "http://localhost:3000";
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Which social sign-ins have credentials configured. */
export function enabledProviders(): Record<OAuthProvider, boolean> {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  };
}

export function oauthClient(provider: OAuthProvider, origin: string) {
  const redirect = `${origin}/auth/callback/${provider}`;
  if (provider === "google") {
    return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirect);
  }
  return new MicrosoftEntraId(
    process.env.MICROSOFT_TENANT_ID || "common",
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_CLIENT_SECRET!,
    redirect,
  );
}

export const OAUTH_SCOPES: Record<OAuthProvider, string[]> = {
  google: ["openid", "email", "profile"],
  microsoft: ["openid", "email", "profile"],
};
