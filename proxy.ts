import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { getTrustedOrigins } from "@/lib/auth/trustedOrigins";
import { resolveUniversityPath } from "@/lib/universityPath";

/**
 * Auth gerektirmeyen (public) yollar.
 * Bu listenin dışındaki tüm route'lar Clerk ile korunur.
 *
 * Kalıplar kesin yazılır: bir ağaç için '/yol' + '/yol/(.*)' çifti, tek uç nokta için
 * tam yol. '/yol(.*)' biçimi aynı önekle başlayan kardeş yolları da (ör. '/yolx')
 * açtığı için kullanılmaz. Eşleştirme Clerk'in kendi eşleştiricisiyle
 * `npm run check:routes` içinde denenir.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/ai-mentor', '/ai-mentor/(.*)',
  '/api/expert-leads',     // Yalnızca POST uzman ön görüşme formu
  '/api/universities',
  '/api/webhooks/clerk',   // Clerk hesap olayları; yalnızca imzası doğrulanan POST (hesap silme temizliği)
  '/data/(.*)',            // Public static datasets: scholarship map GeoJSON
  '/sign-in', '/sign-in/(.*)',
  '/sign-up', '/sign-up/(.*)',
  '/universities', '/universities/(.*)', // Ziyaretçiler okulları ve detayları görebilsin
  '/cities', '/cities/(.*)',             // Ziyaretçiler şehir rehberlerini görebilsin
  '/isee', '/isee/(.*)',                 // Ziyaretçiler burs hesaplayıcıyı kullanabilsin
  '/scholarships', '/scholarships/(.*)', // Ziyaretçiler burs haritasını görebilsin
  '/communities', '/communities/(.*)',   // Ziyaretçiler topluluk rehberini görebilsin
  '/topluluklar', '/topluluklar/(.*)',   // Türkçe kısa yol -> /communities
  '/yasal', '/yasal/(.*)',               // Yasal sayfalar (gizlilik, kullanım koşulları, çerez)
  '/giris', '/giris/(.*)',               // Türkçe giriş/kayıt sayfası + Google dönüşü
  '/on-gorusme', '/on-gorusme/(.*)',     // Ücretsiz ön görüşme sayfası
  '/sitemap.xml',      // Google botları için
  '/robots.txt',       // Google botları için
  '/llms.txt',         // AI asistanlari icin discovery dosyasi (public/llms.txt); matcher .txt'yi statik saymaz, allowlist sart
]);

const PROTECTED_PAGE_ROUTES = [
  "/documents",
  "/ekip",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/profile",
  "/sat",
];

// Oturumsuz API isteği Clerk'in varsayılan cevabını alır; fetch çağrısı HTML giriş
// sayfasına yönlendirilmez.
const isApiRoute = createRouteMatcher(['/api/(.*)']);

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

// Her okulun tek adresi olur: standart disi okul id'si (ör. /universities/003) sayfa uretilmeden ve
// onbellege yazilmadan once kanonik adrese 308 ile gider, sayi olmayan id 404 alir (lib/universityPath.ts).
function handleUniversityPath(request: NextRequest) {
  const decision = resolveUniversityPath(request.nextUrl.pathname);
  if (decision.kind === "redirect") {
    const target = request.nextUrl.clone();
    target.pathname = decision.pathname;
    return NextResponse.redirect(target, 308);
  }
  if (decision.kind === "notFound") {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  return null;
}

export default clerkMiddleware(
  async (auth, request) => {
    const universityPathResponse = handleUniversityPath(request);
    if (universityPathResponse) {
      return universityPathResponse;
    }

    if (isPublicRoute(request)) {
      return;
    }

    if (isProtectedPageRoute(request.nextUrl.pathname)) {
      await auth.protect({
        unauthenticatedUrl: buildSignInRedirectUrl(request),
      });
      return;
    }

    if (isApiRoute(request)) {
      await auth.protect();
      return;
    }

    // Savunma katmani: matcher bugun bu dala yalniz API disi eslesmeyen yol gondermez (listede olmayan
    // sayfa proxy'ye hic girmez ve 404 alir). Matcher genisletilirse listede olmayan sayfa /giris'e gider.
    await auth.protect({
      unauthenticatedUrl: buildSignInRedirectUrl(request),
    });
  },
  {
    // Oturum jetonu yalnız güvenilen kökenlerde üretilmiş olmalı (lib/auth/trustedOrigins.ts).
    authorizedParties: getTrustedOrigins(),
  },
);

// Proxy yalniz is yapacagi isteklerde calisir (denetim S9#6, 2026-09-26). Herkese acik sayfalar,
// statik dosyalar ve ISR onbellekten gelen okul/program sayfalari proxy'siz sunulur (Vercel'de her
// proxy calismasi bir Node fonksiyonu = Active CPU). Listede olmayan adres Next'in 404 sayfasina duser.
// Yeni korumali sayfa: PROTECTED_PAGE_ROUTES'a VE asagiya birlikte eklenir (check:routes esligi denetler).
export const config = {
  matcher: [
    // Korumali sayfalar (PROTECTED_PAGE_ROUTES)
    '/documents/:path*',
    '/ekip/:path*',
    '/favorites/:path*',
    '/hosgeldin/:path*',
    '/hub/:path*',
    '/profile/:path*',
    '/sat/:path*',
    // Okul adresi: yalniz kanonik olmayan id (ör. 003, %33, abc) proxy'ye girer ve 308/404 alir;
    // kanonik id (lib/universityPath.ts: basinda sifir yok, en fazla 9 hane) dogrudan sayfaya gider;
    // Next'in ic RSC bicimleri (7.rsc, 7.json, 7.segments/...) de kanonik sayilir.
    '/universities/((?![1-9][0-9]{0,8}(?:/|$|\\.rsc$|\\.json$|\\.segments/)).+)',
    // API rotalari: korumali olanlar kendi auth() kontrolunu da yapar (auth() proxy ister)
    '/(api|trpc)(.*)',
  ],
};
