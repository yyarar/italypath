import { auth } from "@clerk/nextjs/server";

import {
  getImatCatalog,
  getImatMockQuestions,
  getImatPracticeQuestions,
  getImatReview,
} from "@/lib/imat/questions.server";
import { MOCK_YEARS, SECTIONS } from "@/lib/imat/taxonomy.mjs";
import type { ImatSection } from "@/lib/imat/types";

// Bu route proxy.ts public listesinde DEGIL -> Clerk middleware korur.
// Handler ayrica kendi oturum kontrolunu yapar (proxy'ye tek basina guvenmez).
// ?mock= yaniti cevap anahtari tasimaz; dogru cevap yalniz konu pratiginde ve
// teslim edilmis oturumun ?review= yanitinda gider.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
};

function json(body: unknown, init?: { status: number }) {
  return new Response(JSON.stringify(body), { status: init?.status ?? 200, headers: NO_STORE_HEADERS });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return json({ error: "Giris gerekli." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const review = url.searchParams.get("review");
    const mock = url.searchParams.get("mock");
    const section = url.searchParams.get("section");
    const topic = url.searchParams.get("topic");

    // Sira: review -> mock -> section + topic -> katalog.
    if (review !== null) {
      const result = await getImatReview(review, userId);
      if (!result) return json({ error: "Oturum bulunamadi." }, { status: 404 });
      return json({ session: result.session, questions: result.questions });
    }

    if (mock !== null) {
      const year = Number(mock);
      if (!/^\d{4}$/.test(mock) || !MOCK_YEARS.includes(year)) {
        return json({ error: "Gecersiz parametre." }, { status: 400 });
      }
      const questions = await getImatMockQuestions(year);
      if (questions.length === 0) return json({ error: "Deneme bulunamadi." }, { status: 404 });
      return json({ questions });
    }

    if (section !== null || topic !== null) {
      if (!section || !(SECTIONS as readonly string[]).includes(section) || !topic) {
        return json({ error: "Gecersiz parametre." }, { status: 400 });
      }
      const questions = await getImatPracticeQuestions(section as ImatSection, topic);
      if (questions.length === 0) return json({ error: "Konu bulunamadi." }, { status: 404 });
      return json({ questions });
    }

    const { mocks, topics } = await getImatCatalog();
    return json({ mocks, topics });
  } catch (error) {
    console.error("IMAT questions API hatasi:", error);
    return json({ error: "Soru bankasi su anda kullanilamiyor." }, { status: 503 });
  }
}
