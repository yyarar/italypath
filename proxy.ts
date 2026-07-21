import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

/**
 * Auth gerektirmeyen (public) yollar.
 * Bu listenin dışındaki tüm route'lar Clerk ile korunur.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/universities(.*)',
  '/data(.*)',        // Public static datasets: scholarship map GeoJSON
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/universities(.*)', // Ziyaretçiler okulları ve detayları görebilsin
  '/cities(.*)',       // Ziyaretçiler şehir rehberlerini görebilsin
  '/isee(.*)',         // Ziyaretçiler burs hesaplayıcıyı kullanabilsin
  '/scholarships(.*)', // Ziyaretçiler burs haritasını görebilsin
  '/communities(.*)',  // Ziyaretçiler topluluk rehberini görebilsin
  '/topluluklar(.*)',  // Türkçe kısa yol -> /communities
  '/yasal(.*)',        // Yasal sayfalar (gizlilik, kullanım koşulları, çerez)
  '/giris(.*)',        // Yeni Türkçe giriş/kayıt sayfası
  '/sitemap.xml',      // Google botları için
  '/robots.txt',       // Google botları için
]);

const PROTECTED_PAGE_ROUTES = [
  "/ai-mentor",
  "/documents",
  "/ekip",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/profile",
  "/sat",
];

function isProtectedPageRoute(pathname: string) {
  return PROTECTED_PAGE_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function buildSignInRedirectUrl(request: NextRequest) {
  const signInUrl = new URL("/giris", request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  signInUrl.searchParams.set("redirect_url", requestedPath);

  return signInUrl.href;
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  if (isProtectedPageRoute(request.nextUrl.pathname)) {
    await auth.protect({
      unauthenticatedUrl: buildSignInRedirectUrl(request),
    });
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Next.js'in statik dosyaları hariç her şeyi yakala
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API rotalarını her zaman yakala
    '/(api|trpc)(.*)',
  ],
};
