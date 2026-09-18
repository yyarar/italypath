import type { Language } from "@/components/isee/format";
import type { IseeFormState, StepErrors } from "@/lib/isee/wizardState";

export interface StepProps {
  form: IseeFormState;
  update: (patch: Partial<IseeFormState>) => void;
  errors: StepErrors;
  language: Language;
}
