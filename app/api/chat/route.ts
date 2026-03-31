import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUniversities } from "@/lib/contentRepository";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const SYSTEM_PROMPT_CACHE_TTL_MS = 10 * 60 * 1000;

type CachedPrompt = {
  value: string;
  expiresAt: number;
};

let systemPromptCache: CachedPrompt | null = null;

const SYSTEM_PROMPT_BASE = `Sen ItalyPath Mentörüsün. Türkçe konuşan Türk öğrencilerin İtalya'da üniversite, burs ve yaşam konularında rehber ol.
Samimi, teşvik edici ve bilgili bir ton kullan. Kesin bilgi vermediğin konularda dürüst ol. Yanıtlarını Markdown formatında yaz.
`;

async function getSystemPrompt() {
  if (systemPromptCache && systemPromptCache.expiresAt > Date.now()) {
    return systemPromptCache.value;
  }

  const universities = await getUniversities();
  const uniContext = universities
    .map((university) => {
      const departmentNames = university.departments.map((department) => department.name).join(", ");
      return `• ${university.name} (${university.city}): ${departmentNames}`;
    })
    .join("\n");

  const prompt = `${SYSTEM_PROMPT_BASE}\nBilgi bankan:\n${uniContext}`;
  systemPromptCache = {
    value: prompt,
    expiresAt: Date.now() + SYSTEM_PROMPT_CACHE_TTL_MS,
  };

  return prompt;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return null;
  }

  const normalized: ChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return null;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return null;
    }

    normalized.push({ role, content: trimmedContent });
  }

  if (normalized[normalized.length - 1]?.role !== "user") {
    return null;
  }

  return normalized;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY tanımlı değil.");
    return jsonError("AI servisi şu anda kullanılamıyor.", 503);
  }

  try {
    const systemPrompt = await getSystemPrompt();

    let body: { messages?: unknown };
    try {
      body = (await req.json()) as { messages?: unknown };
    } catch {
      return jsonError("Geçersiz istek gövdesi.", 400);
    }

    const messages = normalizeMessages(body.messages);
    if (!messages) {
      return jsonError("Geçersiz mesaj listesi.", 400);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Sohbet geçmişini Gemini'nin anladığı formata çevir
    // İlk mesaj: sistem promptu (user/model çifti olarak)
    const geminiHistory = [
      { role: "user" as const, parts: [{ text: systemPrompt }] },
      { role: "model" as const, parts: [{ text: "Anlaşıldı! ItalyPath Mentor olarak hazırım." }] },
    ];

    // Önceki mesajları geçmişe ekle (son mesaj hariç)
    for (const msg of messages.slice(0, -1)) {
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
        } catch {
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
    return jsonError("Bir hata oluştu. Lütfen tekrar deneyin.", 500);
  }
}
