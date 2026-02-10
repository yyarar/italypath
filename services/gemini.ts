"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { QuizData } from "@/types"; // 👈 Dosya yolu düzeltildi


const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

const GK_VARIATIONS = [
  "Italian Renaissance Art (Michelangelo, Da Vinci, Raphael)",
  "Italian Geography (Regions, Rivers, Mountains, Climate)",
  "Modern Italian History (Unification to Republic)",
  "Roman Empire History & Architecture",
  "Italian Literature (Dante, Petrarch, Boccaccio, Modern authors)",
  "Italian Cinema (Fellini, Benigni, Neorealism)",
  "Italian Political System & Constitution",
  "Famous Italian Scientists & Inventors (Galileo, Fermi, Marconi)",
  "Italian Music (Opera, Verdi, Puccini, Vivaldi)",
  "Italian Cuisine History & Regional Specialties",
  "Major Italian Cities & Landmarks (Venice, Florence, Naples)",
  "Contemporary Italian Culture & Fashion"
];

export const generateQuizQuestions = async (topic: string, subTopic?: string | null, count: number = 3): Promise<QuizData[]> => {
  try {
    // Model tanımlaması
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Veya erişimin varsa "gemini-2.0-flash"
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question: { type: SchemaType.STRING },
              options: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              correctAnswer: { type: SchemaType.STRING },
              explanation: { type: SchemaType.STRING },
              optionsExplanations: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: "Specific explanation for each option index."
              },
              hint: { type: SchemaType.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation", "optionsExplanations", "hint"],
          }
        },
      }
    });

    let specificTopic = topic;

    if (topic === 'General Knowledge') {
      const randomFocus = GK_VARIATIONS[Math.floor(Math.random() * GK_VARIATIONS.length)];
      specificTopic = `Italian General Knowledge, specifically focusing on: ${randomFocus}`;
    } else if (subTopic) {
      if (topic === 'Math') {
        specificTopic = `${topic} - ${subTopic} (SAT Curriculum)`;
      } else if (topic === 'Science') {
        specificTopic = `${topic} - ${subTopic} (IMAT / TOLC Curriculum)`;
      } else {
        specificTopic = `${topic} - ${subTopic}`;
      }
    }

    const prompt = `
      Create ${count} DISTINCT multiple-choice questions.
      Topic: ${specificTopic}.
      Difficulty: Medium to Hard.
      Language: Questions in English.
      
      Requirements:
      1. 5 options per question.
      2. Correct answer matching one option.
      3. Explanation in TURKISH.
      4. 'optionsExplanations': Array of TURKISH explanations for EACH option (Distractor Analysis).
      5. Hint in TURKISH.
      6. Use LaTeX ($...$) for math.
      7. Use standard Turkish characters.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) throw new Error("No data returned from Gemini");

    return JSON.parse(responseText) as QuizData[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Sorular oluşturulurken bir hata meydana geldi.");
  }
};