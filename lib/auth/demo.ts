/**
 * The shared test account. Sign in as admin@forma.com (or just "admin") with
 * DEMO_ADMIN_PASSWORD, which defaults to Admin123!. Set the variable to "off"
 * to disable password sign-in for it. scripts/migrate.mjs creates the account
 * and keeps its password in sync; keep the two in step.
 */
export const DEMO_EMAIL = "admin@forma.com";
export const DEMO_USERNAME = "admin";
export const DEMO_DEFAULT_PASSWORD = "Admin123!";

/** The password in effect, or "" when the account is switched off. */
export function demoPassword(): string {
  const value = process.env.DEMO_ADMIN_PASSWORD;
  if (value === undefined || value === "") return DEMO_DEFAULT_PASSWORD;
  return value.toLowerCase() === "off" || value.length < 8 ? "" : value;
}
