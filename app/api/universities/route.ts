import { NextResponse } from "next/server";
import { universitiesData } from "@/app/data";

export async function GET() {
  return NextResponse.json(universitiesData, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
