import { NextResponse } from "next/server";

import { getScholarshipsDataset } from "@/lib/contentRepository";

export async function GET() {
  const scholarships = await getScholarshipsDataset();

  return NextResponse.json(scholarships, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
