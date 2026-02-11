"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { universitiesData } from "@/app/data"; // Dosya yoluna göre ayarla

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

export const askMentor = async (history: { role: string; parts: { text: string }[] }[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const uniContext = universitiesData
      .map((u) => `• ${u.name} (${u.city}): ${u.departments.join(", ")}`)
      .join("\n");

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Sen ItalyPath Mentorüsün. Bilgi bankan: ${uniContext}` }],
        },
        {
          role: "model",
          parts: [{ text: "Anlaşıldı patron, İtalya uzmanı olarak hazırım!" }],
        },
        ...history.slice(0, -1) // Geçmişi ekle
      ],
    });

    const lastMessage = history[history.length - 1].parts[0].text;
    const result = await chat.sendMessage(lastMessage);
    return result.response.text();
  } catch (error) {
    console.error("Mentor Error:", error);
    return "Scusa! Bir hata oluştu patron.";
  }
};