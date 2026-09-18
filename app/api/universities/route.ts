import { NextResponse } from "next/server";
import { getUniversitiesDirectory } from "@/lib/universities.server";
import type { University } from "@/types/universities";

export const dynamic = "force-dynamic";

// Bolum sinifi kodlari yalnizca sunucuda ("ayni alanda diger universiteler") kullanilir; tarayiciya
// gondermek yaniti ~22 KB buyutur. Dizin memo'su paylasildigi icin yerinde degistirilmez, kopyalanir.
function toBrowserDirectory(universities: University[]): University[] {
  return universities.map((university) => ({
    ...university,
    departments: university.departments.map((department) => {
      if (!department.degreeClassCodes) return department;
      const browserDepartment = { ...department };
      delete browserDepartment.degreeClassCodes;
      return browserDepartment;
    }),
  }));
}

export async function GET() {
  try {
    const universities = toBrowserDirectory(await getUniversitiesDirectory());

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
