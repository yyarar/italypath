import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { universitiesData } from "../../data";

export const runtime = "edge";

// ItalyPath Mentor için kullanılacak Gemini modelleri (fallback sıralı)
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: Request) {
  try {
    // Frontend'deki `useChat` hook'u buraya UIMessage[] gönderiyor
    const { messages }: { messages: UIMessage[] } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key eksik, patron!" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // Üniversite datasını modele uygun, kompakt bir bağlam metnine çeviriyoruz
    const uniContext = universitiesData
      .map(
        (u) =>
          `• ${u.name.toUpperCase()} (${u.city}): Bölümler: ${u.departments.join(
            ", "
          )}. Yıllık Ücret: ${u.fee}.`
      )
      .join("\n");

    const systemPrompt = `
Sen ItalyPath'in Kıdemli Eğitim Danışmanı ve İtalya Uzmanısın.
Görevin: İtalya'da üniversite okumak isteyen öğrencilere A'dan Z'ye rehberlik etmek.

BİLGİ BANKASI (Üniversiteler):
${uniContext}

UZMANLIK ALANLARIN:
1. BÜROKRASİ: Universitaly portal kaydı, CIMEA denklik belgesi ve DOV süreci.
2. BURSLAR: DSU (Bölgesel Burs) şartları, ISEE belgesi ve yemek/konaklama destekleri.
3. SINAVLAR: IMAT, TIL, TOLC-E/F/I ve İngilizce yeterlilik (IELTS/TOEFL).
4. YAŞAM: Şehir bazlı yaşam maliyetleri, konaklama ve oturum izni (Permesso di Soggiorno).

DAVRANIŞ KURALLARI:
- Karakter: Profesyonel, samimi, çözüm odaklı ve İtalyan zarafetine sahip.
- Format: Cevaplarını Markdown kullanarak (kalın yazılar, listeler) yapılandır. Mobil için paragrafları kısa tut.
- Dil: Kullanıcı hangi dilde yazarsa o dilde (TR/EN) cevap ver.
- Emojiler: 🇮🇹, 🎓, 🏛️, 🍝 gibi emojileri anlamlı ve dozunda kullan.

Eğer veri setinde olmayan bir okul sorulursa: "Bu okul veri tabanımızda detaylı yer almıyor ancak genel İtalyan prosedürleri şöyledir..." diyerek rehberliğe devam et.`;

    // UI mesajlarını model mesajlarına çeviriyoruz
    const modelMessages = await convertToModelMessages(messages);

    // Model kotası dolarsa bir alt modele geçerek yeniden dene
    const attemptStream = async (
      index: number
    ): Promise<ReturnType<typeof streamText>> => {
      try {
        return streamText({
          model: google(MODELS[index]),
          system: systemPrompt,
          messages: modelMessages,
          temperature: 0.7,
        });
      } catch (err: any) {
        if (err?.status === 429 && index < MODELS.length - 1) {
          console.warn(
            `Patron, ${MODELS[index]} kotası doldu. ${MODELS[index + 1]} modeline geçiyorum.`
          );
          return attemptStream(index + 1);
        }
        throw err;
      }
    };

    const result = await attemptStream(0);

    // `useChat` ile uyumlu SSE text stream cevabı
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("ItalyPath AI Critical Error:", error);
    return new Response(
      JSON.stringify({
        error:
          "Şu an İtalyan kahvesi molasındayız, lütfen biraz sonra tekrar dene.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}