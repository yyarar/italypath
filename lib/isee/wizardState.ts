// ISEE Parificato sihirbazının saf form mantığı: boş durum, adım doğrulama, form → hesap girdisi.
// React içermez; scripts/check-isee-calculator.mjs tarafından tek dosya olarak test edilir (yalnızca `import type`).

import type { EarnerKind, ParificatoInput } from "./parificato";
import type { ReferenceYear } from "./reference";

export type Tenure = "owned" | "rented" | "free";

export interface EarnerForm {
  id: number;
  kind: EarnerKind | null;
  grossTry: number | null;
}

export interface IseeFormState {
  members: number | null;
  children: number | null;
  hasMinorChildren: boolean | null;
  hasChildUnderThree: boolean | null;
  parentsWork: boolean | null;
  disabledMembers: number;
  referenceYear: ReferenceYear;
  earners: EarnerForm[];
  tenure: Tenure | null;
  homeSqm: number | null;
  homeMortgageTry: number | null;
  annualRentTry: number | null;
  hasOtherBuildings: boolean | null;
  otherSqm: number | null;
  otherMortgageTry: number | null;
  savingsTry: number | null;
  savingsEur: number | null;
}

export type StepKey = "household" | "income" | "property" | "savings";

export const STEP_ORDER: StepKey[] = ["household", "income", "property", "savings"];

export const MAX_EARNERS = 6;

export type FieldErrorKey =
  | "choose"
  | "childrenExceedMembers"
  | "earnersEmpty"
  | "earnerKind"
  | "earnerAmount"
  | "sqm"
  | "rent"
  | "savings";

export type StepErrors = Record<string, FieldErrorKey>;

export function createEmptyForm(defaultYear: ReferenceYear): IseeFormState {
  return {
    members: null,
    children: null,
    hasMinorChildren: null,
    hasChildUnderThree: null,
    parentsWork: null,
    disabledMembers: 0,
    referenceYear: defaultYear,
    earners: [{ id: 1, kind: null, grossTry: null }],
    tenure: null,
    homeSqm: null,
    homeMortgageTry: null,
    annualRentTry: null,
    hasOtherBuildings: null,
    otherSqm: null,
    otherMortgageTry: null,
    savingsTry: null,
    savingsEur: null,
  };
}

export function nextEarnerId(earners: EarnerForm[]): number {
  return earners.reduce((highest, earner) => Math.max(highest, earner.id), 0) + 1;
}

function isPositive(value: number | null): boolean {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function validateStep(step: StepKey, form: IseeFormState): StepErrors {
  const errors: StepErrors = {};

  if (step === "household") {
    if (!isPositive(form.members)) errors.members = "choose";
    if (form.children === null) errors.children = "choose";
    else if (form.members !== null && form.children > form.members) errors.children = "childrenExceedMembers";

    if (form.children !== null && form.children > 0 && !errors.children) {
      if (form.hasMinorChildren === null) errors.hasMinorChildren = "choose";
      else if (form.hasMinorChildren) {
        if (form.hasChildUnderThree === null) errors.hasChildUnderThree = "choose";
        if (form.parentsWork === null) errors.parentsWork = "choose";
      }
    }
  }

  if (step === "income") {
    if (form.earners.length === 0) errors.earners = "earnersEmpty";
    for (const earner of form.earners) {
      if (earner.kind === null) errors[`earner-${earner.id}-kind`] = "earnerKind";
      if (!isPositive(earner.grossTry)) errors[`earner-${earner.id}-amount`] = "earnerAmount";
    }
  }

  if (step === "property") {
    if (form.tenure === null) errors.tenure = "choose";
    if (form.tenure === "owned" && !isPositive(form.homeSqm)) errors.homeSqm = "sqm";
    if (form.tenure === "rented" && !isPositive(form.annualRentTry)) errors.annualRentTry = "rent";
    if (form.hasOtherBuildings === null) errors.hasOtherBuildings = "choose";
    if (form.hasOtherBuildings === true && !isPositive(form.otherSqm)) errors.otherSqm = "sqm";
  }

  if (step === "savings") {
    if (form.savingsTry === null || !Number.isFinite(form.savingsTry) || form.savingsTry < 0) {
      errors.savingsTry = "savings";
    }
  }

  return errors;
}

export function toParificatoInput(form: IseeFormState): ParificatoInput {
  const children = form.children ?? 0;
  const hasMinorChildren = children > 0 && form.hasMinorChildren === true;

  let home: ParificatoInput["home"] = { tenure: "free" };
  if (form.tenure === "owned") {
    home = { tenure: "owned", sqm: form.homeSqm ?? 0, mortgageTry: form.homeMortgageTry ?? 0 };
  } else if (form.tenure === "rented") {
    home = { tenure: "rented", annualRentTry: form.annualRentTry ?? 0 };
  }

  return {
    members: form.members ?? 1,
    children,
    hasMinorChildren,
    hasChildUnderThree: hasMinorChildren && form.hasChildUnderThree === true,
    parentsWork: hasMinorChildren && form.parentsWork === true,
    disabledMembers: form.disabledMembers,
    earners: form.earners
      .filter((earner) => earner.kind !== null)
      .map((earner) => ({ kind: earner.kind as EarnerKind, grossTry: earner.grossTry ?? 0 })),
    home,
    otherBuildings:
      form.hasOtherBuildings === true
        ? { sqm: form.otherSqm ?? 0, mortgageTry: form.otherMortgageTry ?? 0 }
        : { sqm: 0, mortgageTry: 0 },
    savings: { tryAmount: form.savingsTry ?? 0, eurAmount: form.savingsEur ?? 0 },
  };
}
