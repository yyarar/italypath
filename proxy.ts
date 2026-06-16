import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Auth gerektirmeyen (public) yollar.
 * Bu listenin dışındaki tüm route'lar `auth.protect()` ile korunur.
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
