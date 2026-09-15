import { NextResponse } from "next/server";
import { getUniversitiesDirectory } from "@/lib/universities.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const universities = await getUniversitiesDirectory();

    return NextResponse.json(universities, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
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
