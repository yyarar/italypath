import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Clerk Frontend API (canli, ozel alan adi) ve kullanici gorselleri.
const CLERK_FRONTEND_API = "https://clerk.italypath.app";
const CLERK_IMAGES = "https://img.clerk.com";

function supabaseOrigins() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { https: url.origin, wss: `wss://${url.host}` };
  } catch {
    return null;
  }
}

const supabase = supabaseOrigins();

// Clerk test anahtari (yerel + Preview) development instance'a ve Clerk telemetrisine
// baglanir; `next dev` ayrica eval, HMR soketi ve Vercel Analytics debug betigi ister.
// Canli (pk_live + production build) politikaya bunlarin hicbiri girmez.
const usesClerkDevInstance =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ?? false;
const CLERK_DEV_SCRIPT_SOURCES = usesClerkDevInstance ? ["https://*.clerk.accounts.dev"] : [];
const CLERK_DEV_CONNECT_SOURCES = usesClerkDevInstance
  ? ["https://*.clerk.accounts.dev", "https://clerk-telemetry.com"]
  : [];
const DEV_SCRIPT_SOURCES = isDev ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : [];
const DEV_CONNECT_SOURCES = isDev ? ["ws:"] : [];

// Adim 1: izin listesi yalniz rapor modunda (engellemez, tarayici konsoluna yazar).
// Nonce tabanli CSP kullanilmaz: her istekte degisen nonce ISR onbellegini bozar.
// Satir ici betik (Next onyukleme + JSON-LD) bu yuzden 'unsafe-inline' ile izinli.
const reportOnlyPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    CLERK_FRONTEND_API,
    ...CLERK_DEV_SCRIPT_SOURCES,
    ...DEV_SCRIPT_SOURCES,
  ].join(" "),
  [
    "connect-src 'self'",
    CLERK_FRONTEND_API,
    ...(supabase ? [supabase.https, supabase.wss] : []),
    ...CLERK_DEV_CONNECT_SOURCES,
    ...DEV_CONNECT_SOURCES,
  ].join(" "),
  ["img-src 'self' data: blob:", CLERK_IMAGES, ...(supabase ? [supabase.https] : [])].join(" "),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Zorunlu (engelleyen) politika: hicbir sayfa baska sitede cerceve icinde acilmaz.
const enforcedPolicy = ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: enforcedPolicy },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/giris',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/giris?mode=kayit',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
