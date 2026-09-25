// JSON-LD <script> govdesi: veritabanindan gelen metin HTML olarak yorumlanabilecek karakter
// tasiyabilir. <, > ve & JSON'un kendi Unicode kacisiyla yazilir; JSON degeri aynen korunur
// (Google ayni veriyi okur). Tum JSON-LD etiketleri bu yardimciyi kullanir; check:seo-vitals
// dangerouslySetInnerHTML icinde ham JSON.stringify'a izin vermez (guvenlik denetimi S5#3).
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
