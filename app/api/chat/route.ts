import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { universitiesData } from "@/app/data";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return new Response("API Key eksik!", { status: 500 });

    const google = createGoogleGenerativeAI({ apiKey });

    const optimizedData = universitiesData.map((u) => ({
      id: u.id,
      ad: u.name,
      sehir: u.city,
      bolumler: u.departments,
      ucret: u.fee,
    }));

    const systemPrompt = `Sen ItalyPath asistanısın. İtalya'da eğitim hakkında bilgi veriyorsun.
VERİ SETİ: ${JSON.stringify(optimizedData)}
KURALLAR: Samimi ol, emojiler kullan (🇮🇹, 🎓), kısa ve öz cevaplar ver. 
Bir okulun adını verdiğinde kullanıcıya yardımcı olacak şekilde listele.`;

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error("AI Error:", error);
    const message = error instanceof Error ? error.message : "Model Hatası";
    return new Response(message, { status: 500 });
  }
}
