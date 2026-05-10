import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { universitiesData } from "@/app/data";
import { mergeUniversityDepartmentRows } from "@/lib/mergeUniversityDepartments";
import type { SupabaseUniversityDepartmentRow } from "@/types";

const UNIVERSITY_DEPARTMENT_COLUMNS =
  "university_id,name,slug,languages,duration_years,level,sort_order";
const UNIVERSITY_DEPARTMENT_PAGE_SIZE = 1000;

async function fetchUniversityDepartmentRows(): Promise<SupabaseUniversityDepartmentRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const rows: SupabaseUniversityDepartmentRow[] = [];

  for (let from = 0; ; from += UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
    const to = from + UNIVERSITY_DEPARTMENT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("university_departments")
      .select(UNIVERSITY_DEPARTMENT_COLUMNS)
      .order("university_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to)
      .returns<SupabaseUniversityDepartmentRow[]>();

    if (error) {
      console.error("Failed to fetch university departments from Supabase:", error.message);
      return [];
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
      return rows;
    }
  }
}

export async function GET() {
  const departmentRows = await fetchUniversityDepartmentRows();
  const universities = mergeUniversityDepartmentRows(universitiesData, departmentRows);

  return NextResponse.json(universities, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
