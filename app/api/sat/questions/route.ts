import { getSatQuestions, getSatTopics } from "@/lib/sat/questions.server";

// Bu route proxy.ts public listesinde DEGIL -> Clerk middleware korur.
// Icerik korumali (College Board sorulari): public listeye asla ekleme.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    const skill = url.searchParams.get("skill");

    if (!section && !skill) {
      const topics = await getSatTopics();
      return new Response(JSON.stringify({ topics }), { headers: NO_STORE_HEADERS });
    }

    if ((section !== "math" && section !== "reading-writing") || !skill) {
      return new Response(JSON.stringify({ error: "Gecersiz parametre." }), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const questions = await getSatQuestions(section, skill);
    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "Konu bulunamadi." }), {
        status: 404,
        headers: NO_STORE_HEADERS,
      });
    }

    return new Response(JSON.stringify({ questions }), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("SAT questions API hatasi:", error);
    return new Response(JSON.stringify({ error: "Soru bankasi su anda kullanilamiyor." }), {
      status: 503,
      headers: NO_STORE_HEADERS,
    });
  }
}
