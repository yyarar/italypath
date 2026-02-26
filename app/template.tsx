"use client";

/**
 * Template — Next.js View Transitions API ile sayfa geçişleri artık tarayıcı
 * tarafından yönetildiğinden, Framer Motion animasyonu kaldırılmıştır.
 * viewTransition: true → next.config.ts'te aktif.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
