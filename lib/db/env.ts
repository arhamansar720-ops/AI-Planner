export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  key:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function isSupabaseConfigured() {
  return Boolean(supabaseEnv.url && supabaseEnv.key);
}
