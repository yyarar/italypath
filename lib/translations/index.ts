import { tr, type Translations } from "./tr";

// Arayuz metinleri iki dosyadadir: tr.ts (varsayilan, her sayfada) ve en.ts (yalniz Ingilizce secilince).
// Ingilizce metinler ilk yukleme paketine girmez (guvenlik ve optimizasyon denetimi O3#4, 2026-09-26);
// en.ts'yi statik import etme, loadEnglishTranslations() kullan. Yeni metin iki dosyaya birlikte eklenir.

export { tr };
export type { Translations };
export type Language = "tr" | "en";

let englishRequest: Promise<Translations> | null = null;
let englishLoaded: Translations | null = null;

export function getLoadedEnglishTranslations(): Translations | null {
  return englishLoaded;
}

export function loadEnglishTranslations(): Promise<Translations> {
  englishRequest ??= import("./en").then(
    ({ en }) => {
      englishLoaded = en;
      return en;
    },
    (error: unknown) => {
      // Baglanti koparsa bir sonraki denemede yeniden istenir.
      englishRequest = null;
      throw error;
    }
  );
  return englishRequest;
}
