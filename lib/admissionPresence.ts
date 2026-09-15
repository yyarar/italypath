import type { Department } from "@/types/universities";

// Kabul dosyasi varligi: detay sayfasinda tam admissionDetails, dizin (hafif) verisinde yalnizca bayrak gelir.
export function hasAdmissionDossier(
  department: Pick<Department, "admissionDetails" | "hasAdmissionDetails">
): boolean {
  return Boolean(department.admissionDetails) || department.hasAdmissionDetails === true;
}
