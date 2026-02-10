import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { universitiesData } from "@/app/data";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDvFooYGGz-Hn62j-2pNk4eBFnSDU_0_uo";

    if (!apiKey) {
       return NextResponse.json({ error: "API Key eksik!" }, { status: 500 });
    }

    // Veri Optimizasyonu
    const optimizedData = universitiesData.map(u => ({
      id: u.id,
      ad: u.name,
      sehir: u.city,
      tur: u.type,
      bolumler: u.departments, 
      ucret: u.fee,
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 👇 ESKİ VE ÇALIŞAN MODEL AYARI
    // Senin sisteminde sorunsuz çalışan modele geri döndük.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: `
        ROL: Sen ItalyPath platformunun asistanısın.
        GÖREV: Aşağıdaki veri setine dayanarak öğrenciye yardımcı ol.
        
        VERİ SETİ:
        ${JSON.stringify(optimizedData)}

        KURALLAR:
        1. Önceki konuşmaları hatırla (bağlamı koru).
        2. Cevabın yarım kalmamalı.
        3. Listeleme yaparken en fazla 5 okul öner.
        4. Emoji kullan (🇮🇹, 🎓).
        5. Samimi ol.
        `,
    });

    // Geçmişi modele uygun formata çeviriyoruz
    const chatHistory = history ? history.map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    })) : [];

    // Sohbeti geçmişle başlat
    const chat = model.startChat({
        history: chatHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });
    
  } catch (error: any) {
    console.error("AI Error:", error); 
    return NextResponse.json({ error: error.message || "Model Hatası" }, { status: 500 });
  }
}