import { GoogleGenerativeAI } from "@google/generative-ai";
import { universitiesData } from "@/app/data";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Üniversite bilgilerini sistem bağlamına hazırla
const uniContext = universitiesData
  .map((u) => `• ${u.name} (${u.city}): ${u.departments.map(d => d.name).join(", ")}`)
  .join("\n");

const SYSTEM_PROMPT = `Sen ItalyPath Mentörüsün. Türkçe konuşan Türk öğrencilerin İtalya'da üniversite, burs ve yaşam konularında rehber ol.
Samimi, teşvik edici ve bilgili bir ton kullan. Kesin bilgi vermediğin konularda dürüst ol. Yanıtlarını Markdown formatında yaz.

Bilgi bankan:
${uniContext}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Sohbet geçmişini Gemini'nin anladığı formata çevir
    // İlk mesaj: sistem promptu (user/model çifti olarak)
    const geminiHistory = [
      { role: "user" as const, parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model" as const, parts: [{ text: "Anlaşıldı! ItalyPath Mentor olarak hazırım." }] },
    ];

    // Önceki mesajları geçmişe ekle (son mesaj hariç)
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      geminiHistory.push({
        role: msg.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: msg.content }],
      });
    }

    const chat = model.startChat({ history: geminiHistory });

    // Son kullanıcı mesajını stream olarak gönder
    const lastUserMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessageStream(lastUserMessage);

    // ReadableStream oluştur — her chunk geldiğinde frontend'e ilet
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode("\n\n_Scusa! Bir hata oluştu._")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API Hatası:", error);
    return new Response(
      JSON.stringify({ content: "Bir hata oluştu patron." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}