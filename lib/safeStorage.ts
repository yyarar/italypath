// Tarayici hafizasi (localStorage) icin guvenli okuma/yazma. Site verisi
// engelli veya gizli pencerede kota dolu oldugunda erisim hata firlatir;
// bu yardimcilar hatayi yutar. Yazma basarisiz olursa deger bu sekme acik
// kaldikca bellekte tutulur, boylece dil gibi tercihler oturum boyunca calisir.

const memoryFallback = new Map<string, string>();

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    const stored = browserStorage()?.getItem(key);
    if (stored != null) return stored;
  } catch {
    // Engelli hafiza: bellekteki degere duser.
  }
  return memoryFallback.get(key) ?? null;
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    const storage = browserStorage();
    if (storage) {
      storage.setItem(key, value);
      memoryFallback.delete(key);
      return true;
    }
  } catch {
    // Engelli hafiza veya dolu kota: asagida bellege yazilir.
  }
  memoryFallback.set(key, value);
  return false;
}

export function safeRemoveItem(key: string): void {
  memoryFallback.delete(key);
  try {
    browserStorage()?.removeItem(key);
  } catch {
    // Engelli hafiza: silinecek kalici deger de yoktur.
  }
}
