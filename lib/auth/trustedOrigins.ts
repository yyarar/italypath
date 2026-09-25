// Clerk'in guvendigi site kokenleri. proxy.ts (authorizedParties) ve app/layout.tsx
// (allowedRedirectOrigins) ayni listeyi kullanir; tek kaynak burasi.
//
// - Vercel Production: yalniz canli alan adi.
// - Vercel Preview: canli alan adi + o yayinin kendi *.vercel.app adresleri
//   (Preview Clerk development anahtariyla calisir, bkz. README).
// - Yerel (Vercel disi): canli alan adi + CLERK_DEV_ORIGINS (virgulle ayrilmis
//   kokenler; verilmezse http://localhost:3000). Farkli port kullanan yerel
//   sunucu bu degiskeni .env.local'de vermelidir, yoksa oturum taninmaz.
export const PRODUCTION_ORIGIN = "https://italypath.app";

const DEFAULT_DEV_ORIGINS = "http://localhost:3000";

function splitOrigins(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getTrustedOrigins(): string[] {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === "production") {
    return [PRODUCTION_ORIGIN];
  }

  if (vercelEnv === "preview") {
    const previewHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(
      (host): host is string => Boolean(host),
    );
    return [PRODUCTION_ORIGIN, ...previewHosts.map((host) => `https://${host}`)];
  }

  return [
    PRODUCTION_ORIGIN,
    ...splitOrigins(process.env.CLERK_DEV_ORIGINS ?? DEFAULT_DEV_ORIGINS),
  ];
}
