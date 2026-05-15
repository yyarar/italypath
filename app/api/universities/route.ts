import { NextResponse } from "next/server";
import { getUniversitiesData } from "@/lib/universities.server";

export async function GET() {
  try {
    const universities = await getUniversitiesData();

    return NextResponse.json(universities, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to load university data:", error);
    return NextResponse.json(
      { error: "University data is currently unavailable." },
      { status: 503 }
    );
  }
}
