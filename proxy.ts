import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Auth gerektirmeyen (public) yollar.
 * Bu listenin dışındaki tüm route'lar `auth.protect()` ile korunur.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/universities(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/universities(.*)', // Ziyaretçiler okulları ve detayları görebilsin
  '/isee(.*)',         // Ziyaretçiler burs hesaplayıcıyı kullanabilsin
  '/sitemap.xml',     // Google botları için
  '/robots.txt',      // Google botları için
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Eğer rota public değilse, kullanıcıyı doğrula
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.js'in statik dosyaları hariç her şeyi yakala
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API rotalarını her zaman yakala
    '/(api|trpc)(.*)',
  ],
};
