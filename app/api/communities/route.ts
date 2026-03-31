import { NextResponse } from "next/server";

import { getCommunityLinks } from "@/lib/contentRepository";

export async function GET() {
  const communities = await getCommunityLinks();

  return NextResponse.json(communities, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
