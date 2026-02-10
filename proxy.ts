import { clerkMiddleware } from "@clerk/nextjs/server";

// Fonksiyonu dışa aktarırken (export) artık varsayılan olarak Clerk'i çağırıyoruz
export default clerkMiddleware();

export const config = {
  matcher: [
    // Next.js'in statik dosyaları hariç her şeyi yakala
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API rotalarını her zaman yakala
    '/(api|trpc)(.*)',
  ],
};