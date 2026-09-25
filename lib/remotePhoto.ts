import type { ImageLoader, ImageLoaderProps } from "next/image";

// Okul fotograflari Unsplash ve Pexels'te durur (2026-09-25: 54 Unsplash, 2 Pexels). Boyutlandirmayi
// bu servislerin kendi adres parametreleri yapar; Vercel gorsel optimizasyonu kullanilmaz ve
// next.config.ts'te uzak alan adi izni yoktur (guvenlik denetimi S9#4). Yalnizca uzak fotograf
// gosteren <Image> bilesenleri bunu kullanir; yerel /images dosyalari varsayilan optimizasyonda kalir.
const UNSPLASH_HOSTS = new Set(["images.unsplash.com", "plus.unsplash.com"]);
const PEXELS_HOST = "images.pexels.com";
const DEFAULT_QUALITY = 75;

function isRemotePhotoHost(hostname: string) {
  return UNSPLASH_HOSTS.has(hostname) || hostname === PEXELS_HOST;
}

export const remotePhotoLoader: ImageLoader = ({ src, width, quality }: ImageLoaderProps) => {
  const url = new URL(src);

  if (UNSPLASH_HOSTS.has(url.hostname)) {
    // Varsayilan optimizasyon gibi kaynaktaki genisligin uzerine buyutmez.
    const sourceWidth = Number(url.searchParams.get("w"));
    const targetWidth =
      Number.isFinite(sourceWidth) && sourceWidth > 0 ? Math.min(width, sourceWidth) : width;
    url.searchParams.set("w", String(targetWidth));
    url.searchParams.set("q", String(quality ?? DEFAULT_QUALITY));
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  if (url.hostname === PEXELS_HOST) {
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("w", String(width));
    return url.toString();
  }

  return src;
};

// <Image {...remotePhotoProps(src)} src={src} />: Unsplash/Pexels kendi boyutlandiricisiyla, baska bir
// uzak adres optimizasyonsuz, yerel dosya varsayilan davranisla.
export function remotePhotoProps(src: string): { loader?: ImageLoader; unoptimized?: boolean } {
  if (!/^https?:\/\//i.test(src)) return {};

  try {
    if (isRemotePhotoHost(new URL(src).hostname)) return { loader: remotePhotoLoader };
  } catch {
    // Gecersiz adres: optimizasyonsuz birak.
  }

  return { unoptimized: true };
}
