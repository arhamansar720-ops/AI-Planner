import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The built-in database (lib/db/embedded.ts) loads its WebAssembly build and
  // the SQL migrations from disk at runtime, so ship them with every server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./db/migrations/*.sql", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
  async redirects() {
    return [{ source: "/landing", destination: "/", permanent: true }];
  },
};

export default nextConfig;
