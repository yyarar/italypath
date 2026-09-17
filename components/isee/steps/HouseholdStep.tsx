"use client";

import { NumberChips, YesNo } from "@/components/isee/fields";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";

export default function HouseholdStep({ form, update, errors }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.household;
  const nav = t.iseeTool.nav;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);
  const hasChildren = (form.children ?? 0) > 0;

  return (
    <div className="space-y-8">
      <NumberChips
        id="isee-members"
        label={copy.heading}
        hint={copy.membersHint}
        min={1}
        max={6}
        value={form.members}
        onChange={(members) => update({ members })}
        increaseLabel={nav.increase}
        decreaseLabel={nav.decrease}
        error={errorFor("members")}
      />

      <NumberChips
        id="isee-children"
        label={copy.childrenLabel}
        hint={copy.childrenHint}
        min={0}
        max={5}
        value={form.children}
        onChange={(children) =>
          update(
            children === 0
              ? { children, hasMinorChildren: null, hasChildUnderThree: null, parentsWork: null }
              : { children },
          )
        }
        increaseLabel={nav.increase}
        decreaseLabel={nav.decrease}
        error={errorFor("children")}
      />

      {hasChildren ? (
        <YesNo
          id="isee-minors"
          label={copy.minorsLabel}
          value={form.hasMinorChildren}
          onChange={(hasMinorChildren) =>
            update(
              hasMinorChildren
                ? { hasMinorChildren }
                : { hasMinorChildren, hasChildUnderThree: null, parentsWork: null },
            )
          }
          yes={nav.yes}
          no={nav.no}
          error={errorFor("hasMinorChildren")}
        />
      ) : null}

      {hasChildren && form.hasMinorChildren ? (
        <>
          <YesNo
            id="isee-under-three"
            label={copy.underThreeLabel}
            value={form.hasChildUnderThree}
            onChange={(hasChildUnderThree) => update({ hasChildUnderThree })}
            yes={nav.yes}
            no={nav.no}
            error={errorFor("hasChildUnderThree")}
          />
          <YesNo
            id="isee-parents-work"
            label={copy.parentsWorkLabel}
            hint={copy.parentsWorkHint}
            value={form.parentsWork}
            onChange={(parentsWork) => update({ parentsWork })}
            yes={nav.yes}
            no={nav.no}
            error={errorFor("parentsWork")}
          />
        </>
      ) : null}

      <details className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
          {copy.specialToggle}
        </summary>
        <div className="border-t border-[var(--editorial-border)] p-4">
          <NumberChips
            id="isee-disabled"
            label={copy.disabledLabel}
            hint={copy.disabledHint}
            min={0}
            max={3}
            hardMax={10}
            value={form.disabledMembers}
            onChange={(disabledMembers) => update({ disabledMembers })}
            increaseLabel={nav.increase}
            decreaseLabel={nav.decrease}
          />
        </div>
      </details>
    </div>
  );
}
