import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Patron, burada korumaya alınmayacak yolları tanımlıyoruz.
 * /api/chat eklenmezse, AI isteği Clerk engeline takılır.
 */
const isPublicRoute = createRouteMatcher([
  '/', 
  '/api/chat(.*)', // AI rotasını serbest bırakıyoruz
  '/sign-in(.*)', 
  '/sign-up(.*)'
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