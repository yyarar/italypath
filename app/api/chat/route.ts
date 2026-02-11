import { GoogleGenerativeAI } from "@google/generative-ai";
import { universitiesData } from "@/app/data";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Üniversite bilgilerini sistem bağlamı olarak ekle
    const uniContext = universitiesData
      .map(u => `• ${u.name} (${u.city}): ${u.departments.join(", ")}`)
      .join("\n");
    
    // Mesaj geçmişini Gemini'nin anladığı formata çevir
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `Sen ItalyPath Mentorüsün. Bilgi bankan: ${uniContext}` }] },
        { role: "model", parts: [{ text: "Anlaşıldı patron!" }] },
      ],
    });

    const lastUserMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastUserMessage);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ content: responseText }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API Hatası:", error);
    return new Response(JSON.stringify({ content: "Bir hata oluştu patron." }), { status: 500 });
  }
}