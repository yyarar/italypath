import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const UNIVERSITY_CHECKS = [
  {
    universityId: 3,
    label: "Bologna",
    expectedDetailCount: 97,
    criticalPrograms: [
      {
        name: "Medicine and Surgery",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Medicine and Surgery (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
      },
      {
        name: "Pharmacy",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Pharmacy (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 5,
      },
      {
        name: "Veterinary Medicine",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Veterinary Medicine (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 5,
      },
      {
        name: "Archaeology",
        level: "master",
        missingProgramMessage: "Missing expected Bologna program: Archaeology (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Archaeology and Cultures of the Ancient World",
        level: "master",
        missingProgramMessage:
          "Missing expected Bologna program: Archaeology and Cultures of the Ancient World (master)",
        requiresDetails: false,
        expectedDurationYears: 2,
      },
      {
        name: "Statistical Sciences",
        level: "bachelor",
        missingProgramMessage: "Missing Statistical Sciences bachelor row",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Statistical Sciences",
        level: "master",
        missingProgramMessage: "Missing Statistical Sciences master row",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 1,
    label: "Polimi",
    expectedDetailCount: 52,
    criticalPrograms: [
      {
        name: "Engineering Science",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Engineering Science (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Industrial Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Industrial Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Process Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Process Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "MEDTEC School",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Polimi program: MEDTEC School (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
        expectedRawLevel: "single-cycle [uncertain]",
        expectedUncertainField: "level",
      },
      {
        name: "Computer Science and Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Polimi program: Computer Science and Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 5,
    label: "Polito",
    expectedDetailCount: 31,
    criticalPrograms: [
      {
        name: "Architecture",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polito program: Architecture (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Computer Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polito program: Computer Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Architecture Construction City",
        level: "master",
        missingProgramMessage:
          "Missing expected Polito program: Architecture Construction City (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Cybersecurity Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Polito program: Cybersecurity Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Industrial Production and Technological Innovation Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Polito program: Industrial Production and Technological Innovation Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Nanotechnologies for ICTs",
        level: "master",
        missingProgramMessage:
          "Missing expected Polito program: Nanotechnologies for ICTs (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 2,
    label: "Sapienza",
    expectedDetailCount: 23,
    criticalPrograms: [
      {
        name: "Applied Computer Science and Artificial Intelligence",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Sapienza program: Applied Computer Science and Artificial Intelligence (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Nursing",
        level: "bachelor",
        missingProgramMessage: "Missing expected Sapienza program: Nursing (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Medicine and Surgery",
        level: "single-cycle",
        missingProgramMessage:
          "Missing expected Sapienza program: Medicine and Surgery (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
      },
      {
        name: "Computer Science",
        level: "master",
        missingProgramMessage: "Missing expected Sapienza program: Computer Science (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Cybersecurity",
        level: "master",
        missingProgramMessage: "Missing expected Sapienza program: Cybersecurity (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 4,
    label: "Padua",
    expectedDetailCount: 71,
    criticalPrograms: [
      {
        name: "Animal Care",
        level: "bachelor",
        missingProgramMessage: "Missing expected Padua program: Animal Care (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Economics, Governance and Decision-Making",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Padua program: Economics, Governance and Decision-Making (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Applied Child and Adolescent Psychology",
        level: "master",
        missingProgramMessage:
          "Missing expected Padua program: Applied Child and Adolescent Psychology (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Management Engineering",
        level: "master",
        missingProgramMessage: "Missing expected Padua program: Management Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Quantum Science and Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Padua program: Quantum Science and Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Medicine and Surgery",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Padua program: Medicine and Surgery (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
        expectedUncertainField: "entry_exam_or_test",
      },
      {
        name: "Medicine and Surgery - MedTech",
        level: "single-cycle",
        missingProgramMessage:
          "Missing expected Padua program: Medicine and Surgery - MedTech (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
        expectedUncertainField: "required_documents",
      },
    ],
  },
  {
    universityId: 9,
    label: "Ca' Foscari",
    expectedDetailCount: 29,
    criticalPrograms: [
      {
        name: "Business Administration and Management",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Business Administration and Management (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Ancient Civilizations for the Contemporary World (inter-university)",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Ancient Civilizations for the Contemporary World (inter-university) (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Computer Science - Data Science",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Computer Science - Data Science (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Hospitality Innovation and e-Tourism",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Hospitality Innovation and e-Tourism (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Comparative International Relations - European Union Studies and Global Studies",
        level: "master",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Comparative International Relations - European Union Studies and Global Studies (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Sustainable Chemistry and Technologies - Biomolecular Chemistry",
        level: "master",
        missingProgramMessage:
          "Missing expected Ca' Foscari program: Sustainable Chemistry and Technologies - Biomolecular Chemistry (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 10,
    label: "Milan",
    expectedDetailCount: 45,
    criticalPrograms: [
      {
        name: "Artificial Intelligence",
        level: "bachelor",
        missingProgramMessage: "Missing expected Milan program: Artificial Intelligence (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Computer Science",
        level: "master",
        missingProgramMessage: "Missing expected Milan program: Computer Science (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "International Medical School (IMS)",
        level: "single-cycle",
        missingProgramMessage:
          "Missing expected Milan program: International Medical School (IMS) (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
        expectedUncertainField: "admission_type",
      },
      {
        name: "Quantitative Biology",
        level: "master",
        missingProgramMessage: "Missing expected Milan program: Quantitative Biology (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 20,
    label: "Genoa",
    expectedDetailCount: 24,
    criticalPrograms: [
      {
        name: "Computer Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Genoa program: Computer Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Maritime Science and Technology",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Genoa program: Maritime Science and Technology (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Computer Engineering",
        level: "master",
        missingProgramMessage: "Missing expected Genoa program: Computer Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Robotics Engineering",
        level: "master",
        missingProgramMessage: "Missing expected Genoa program: Robotics Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Yacht Design",
        level: "master",
        missingProgramMessage: "Missing expected Genoa program: Yacht Design (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Digital Humanities",
        level: "master",
        missingProgramMessage: "Missing expected Genoa program: Digital Humanities (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "International Relations",
        level: "master",
        missingProgramMessage: "Missing expected Genoa program: International Relations (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Sustainable Polymer and Process Chemistry (SMART)",
        level: "master",
        missingProgramMessage:
          "Missing expected Genoa program: Sustainable Polymer and Process Chemistry (SMART) (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 7,
    label: "Bocconi",
    expectedDetailCount: 34,
    criticalPrograms: [
      {
        name: "Economics",
        level: "bachelor",
        missingProgramMessage: "Missing expected Bocconi program: Economics (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Finance",
        level: "bachelor",
        missingProgramMessage: "Missing expected Bocconi program: Finance (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "World Bachelor in Business",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Bocconi program: World Bachelor in Business (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
        expectedUncertainField: "language_requirements",
      },
      {
        name: "HEC-Bocconi Double Program in Data, Society and Organizations",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Bocconi program: HEC-Bocconi Double Program in Data, Society and Organizations (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Accounting and Financial Management",
        level: "master",
        missingProgramMessage:
          "Missing expected Bocconi program: Accounting and Financial Management (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Finance",
        level: "master",
        missingProgramMessage: "Missing expected Bocconi program: Finance (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "IM CEMS MIM",
        level: "master",
        missingProgramMessage: "Missing expected Bocconi program: IM CEMS MIM (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedUncertainField: "degree_class",
      },
      {
        name: "LSE-Bocconi Double Degree",
        level: "master",
        missingProgramMessage:
          "Missing expected Bocconi program: LSE-Bocconi Double Degree (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Transformative Sustainability",
        level: "master",
        missingProgramMessage:
          "Missing expected Bocconi program: Transformative Sustainability (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Master of Arts in Global Law for Organizations, Business Enterprises and Institutions",
        level: "master",
        missingProgramMessage:
          "Missing expected Bocconi program: Master of Arts in Global Law for Organizations, Business Enterprises and Institutions (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 63,
    label: "Florence",
    expectedDetailCount: 18,
    criticalPrograms: [
      {
        name: "Sustainable Business for Societal Challenges",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Florence program: Sustainable Business for Societal Challenges (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
        expectedSourceFile: "Sustainable_Business_for_Societal_Challenges.json",
      },
      {
        name: "Advanced Molecular Sciences",
        level: "master",
        missingProgramMessage: "Missing expected Florence program: Advanced Molecular Sciences (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Advanced_Molecular_Sciences.json",
      },
      {
        name: "Energy Engineering",
        level: "master",
        missingProgramMessage: "Missing expected Florence program: Energy Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Energy_Engineering.json",
      },
      {
        name: "Finance and Risk Management",
        level: "master",
        missingProgramMessage: "Missing expected Florence program: Finance and Risk Management (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Finance_and_Risk_Management.json",
      },
      {
        name: "Geoengineering",
        level: "master",
        missingProgramMessage: "Missing expected Florence program: Geoengineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Geoengineering.json",
      },
      {
        name: "Robotics, Automation and Electrical Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Florence program: Robotics, Automation and Electrical Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Robotics_Automation_and_Electrical_Engineering.json",
      },
    ],
  },
  {
    universityId: 42,
    label: "Link Campus",
    expectedDetailCount: 6,
    criticalPrograms: [
      {
        name: "Business and Institutional Economics and Management",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Link Campus program: Business and Institutional Economics and Management (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
        expectedSourceFile: "Business_and_Institutional_Economics_and_Management.json",
      },
      {
        name: "Communication Sciences, Media and Digital Technologies",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Link Campus program: Communication Sciences, Media and Digital Technologies (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
        expectedSourceFile: "Communication_Sciences_Media_and_Digital_Technologies.json",
      },
      {
        name: "Finance and Artificial Intelligence",
        level: "master",
        missingProgramMessage:
          "Missing expected Link Campus program: Finance and Artificial Intelligence (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Corporate_Management_and_Public_Administration.json",
      },
      {
        name: "Digital Communication Strategies for Media Industries",
        level: "master",
        missingProgramMessage:
          "Missing expected Link Campus program: Digital Communication Strategies for Media Industries (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Media_and_Cultural_Industries.json",
      },
      {
        name: "Political Science, Diplomacy and Government of Administration",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Link Campus program: Political Science, Diplomacy and Government of Administration (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
        expectedSourceFile: "Political_Science_Diplomacy_and_Government_of_Administration.json",
      },
      {
        name: "Global Affairs and International Relations",
        level: "master",
        missingProgramMessage:
          "Missing expected Link Campus program: Global Affairs and International Relations (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedSourceFile: "Strategic_Studies_and_Security_Policies.json",
      },
    ],
  },
  {
    universityId: 19,
    label: "Pisa",
    expectedDetailCount: 18,
    criticalPrograms: [
      {
        name: "International Programme in Humanities (IPH)",
        level: "bachelor",
        missingProgramMessage: "Missing expected Pisa program: International Programme in Humanities (IPH) (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Management for Business and Economics",
        level: "bachelor",
        missingProgramMessage: "Missing expected Pisa program: Management for Business and Economics (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Aerospace Engineering",
        level: "master",
        missingProgramMessage: "Missing expected Pisa program: Aerospace Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Cybersecurity",
        level: "master",
        missingProgramMessage: "Missing expected Pisa program: Cybersecurity (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedApplicationDeadlineEu: "2026-02-25",
      },
      {
        name: "Engineering of Paper and Cardboard",
        level: "master",
        missingProgramMessage: "Missing expected Pisa program: Engineering of Paper and Cardboard (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedCampus: "Lucca (Campus San Micheletto)",
      },
      {
        name: "Materials and Nanotechnology",
        level: "master",
        missingProgramMessage: "Missing expected Pisa program: Materials and Nanotechnology (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
        expectedUncertainField: "lead_department_resolution_among_four_joint_departments",
      },
    ],
  },
];
const failures = [];

function fail(message) {
  failures.push(message);
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function createSupabaseClient() {
  loadDotenvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isArray(value) {
  return Array.isArray(value);
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

const supabase = createSupabaseClient();

if (supabase) {
  for (const universityCheck of UNIVERSITY_CHECKS) {
    const { data: details, error: detailsError } = await supabase
      .from("program_admission_details")
      .select(
        "department_id,university_id,raw_level,campus,application_deadline_eu,official_program_url,required_documents,source_quotes,uncertain,uncertainty_notes,source_file"
      )
      .eq("university_id", universityCheck.universityId);

    if (detailsError) {
      fail(`Failed to fetch ${universityCheck.label} program_admission_details: ${detailsError.message}`);
      continue;
    }

    const detailDepartmentIds = new Set((details ?? []).map((detail) => detail.department_id));
    const detailByDepartmentId = new Map((details ?? []).map((detail) => [detail.department_id, detail]));

    if ((details ?? []).length !== universityCheck.expectedDetailCount) {
      fail(
        `Expected ${universityCheck.expectedDetailCount} ${universityCheck.label} details, got ${(details ?? []).length}`
      );
    }

    for (const detail of details ?? []) {
      if (!isHttpUrl(detail.official_program_url)) {
        fail(`${universityCheck.label} detail ${detail.department_id} has invalid official_program_url`);
      }

      for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
        if (!isArray(detail[field])) {
          fail(`${universityCheck.label} detail ${detail.department_id} has non-array ${field}`);
        }
      }

      if (universityCheck.label === "Padua") {
        for (const document of detail.required_documents ?? []) {
          if (/document_name:|required_for:|source_url:/i.test(document)) {
            fail(`${universityCheck.label} detail ${detail.department_id} has raw document object keys`);
          }
        }

        for (const field of ["academic_requirements", "language_requirements", "entry_exam_or_test"]) {
          if (/[a-z]+_[a-z_]+:/i.test(detail[field] ?? "")) {
            fail(`${universityCheck.label} detail ${detail.department_id} has raw object key in ${field}`);
          }
        }
      }

      for (const [index, quote] of (detail.source_quotes ?? []).entries()) {
        if (!quote || typeof quote !== "object") {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} is not an object`);
          continue;
        }

        if (!isHttpUrl(quote.url)) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid url`);
        }

        if (typeof quote.quote !== "string" || quote.quote.trim().length === 0) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid quote`);
        }

        if (!isArray(quote.field_refs)) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has non-array field_refs`);
        }

        if (typeof quote.retrieved_at !== "string" || quote.retrieved_at.trim().length === 0) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid retrieved_at`);
        }
      }
    }

    const { data: departments, error: departmentsError } = await supabase
      .from("university_departments")
      .select("id,name,slug,level,duration_years")
      .eq("university_id", universityCheck.universityId);

    if (departmentsError) {
      fail(`Failed to fetch ${universityCheck.label} university_departments: ${departmentsError.message}`);
      continue;
    }

    const slugs = new Set();
    for (const department of departments ?? []) {
      if (slugs.has(department.slug)) {
        fail(`duplicate ${universityCheck.label} slug: ${department.slug}`);
      }
      slugs.add(department.slug);

      if (!ALLOWED_LEVELS.has(department.level)) {
        fail(`${universityCheck.label} ${department.slug} has invalid level ${department.level}`);
      }
    }

    for (const {
      name,
      level,
      missingProgramMessage,
      requiresDetails,
      expectedDurationYears,
      expectedRawLevel,
      expectedUncertainField,
      expectedApplicationDeadlineEu,
      expectedCampus,
      expectedSourceFile,
    } of universityCheck.criticalPrograms) {
      const matchingDepartments = (departments ?? []).filter(
        (candidate) => candidate.name === name && candidate.level === level
      );
      const department =
        matchingDepartments.find((candidate) => detailByDepartmentId.has(candidate.id)) ??
        matchingDepartments[0];

      if (!department) {
        fail(missingProgramMessage);
        continue;
      }

      const detail = detailByDepartmentId.get(department.id);
      if (requiresDetails && !detailDepartmentIds.has(department.id)) {
        fail(`Missing admission details for expected ${universityCheck.label} program: ${name} (${level})`);
      }

      if (department.duration_years !== expectedDurationYears) {
        fail(
          `Expected ${universityCheck.label} ${name} (${level}) duration ${expectedDurationYears}, got ${department.duration_years}`
        );
      }

      if (expectedRawLevel && detail?.raw_level !== expectedRawLevel) {
        fail(
          `Expected ${universityCheck.label} ${name} raw_level ${expectedRawLevel}, got ${detail?.raw_level}`
        );
      }

      if (expectedUncertainField && !detail?.uncertain?.includes(expectedUncertainField)) {
        fail(
          `Expected ${universityCheck.label} ${name} uncertain to include ${expectedUncertainField}`
        );
      }

      if (expectedApplicationDeadlineEu && detail?.application_deadline_eu !== expectedApplicationDeadlineEu) {
        fail(
          `Expected ${universityCheck.label} ${name} application_deadline_eu ${expectedApplicationDeadlineEu}, got ${detail?.application_deadline_eu}`
        );
      }

      if (expectedCampus && detail?.campus !== expectedCampus) {
        fail(`Expected ${universityCheck.label} ${name} campus ${expectedCampus}, got ${detail?.campus}`);
      }

      if (expectedSourceFile && detail?.source_file !== expectedSourceFile) {
        fail(
          `Expected ${universityCheck.label} ${name} source_file ${expectedSourceFile}, got ${detail?.source_file}`
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Program details check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Program details check passed.");
