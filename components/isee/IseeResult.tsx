"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

import { fill, formatAmount, formatEuro, type Language } from "@/components/isee/format";
import { useLanguage } from "@/context/LanguageContext";
import type { ParificatoResult } from "@/lib/isee/parificato";
import {
  CITY_THRESHOLDS,
  THRESHOLDS_ACADEMIC_YEAR,
  type CityKey,
  type ReferenceYear,
} from "@/lib/isee/reference";
import type { CityStatus, Light, Verdict } from "@/lib/isee/verdict";

interface IseeResultProps {
  result: ParificatoResult;
  verdict: Verdict<CityKey>;
  referenceYear: ReferenceYear;
  language: Language;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
  onRestart: () => void;
}

const LIGHT_STYLES: Record<Light, { box: string; dot: string; text: string }> = {
  blue: { box: "border-[#b9cde0] bg-[#e6eef5]", dot: "bg-[#2f6ea5]", text: "text-[#1d4568]" },
  yellow: { box: "border-[#e4cd8a] bg-[#f7edd0]", dot: "bg-[#c99700]", text: "text-[#6b4e00]" },
  red: { box: "border-[#e8c9bd] bg-[#f5d9cf]", dot: "bg-[#b3401f]", text: "text-[#8b321a]" },
};

const LIGHT_ICONS: Record<Light, LucideIcon> = { blue: CheckCircle2, yellow: AlertTriangle, red: XCircle };

const STATUS_STYLES: Record<CityStatus, string> = {
  below: "text-[#1d4568]",
  near: "text-[#6b4e00]",
  above: "text-[#8b321a]",
};

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[var(--editorial-border)] px-3 py-2 last:border-b-0 ${
        strong
          ? "bg-[var(--editorial-sage-soft)]/55 font-semibold text-[var(--editorial-ink)]"
          : "text-[var(--editorial-muted)]"
      }`}
    >
      <span className="min-w-0 text-sm leading-5">{label}</span>
      <span className="shrink-0 text-sm tabular-nums">{value}</span>
    </div>
  );
}

function RowGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-[var(--editorial-ink)]">{title}</h4>
      <div className="border border-[var(--editorial-border)] bg-white">{children}</div>
    </div>
  );
}

export default function IseeResult({
  result,
  verdict,
  referenceYear,
  language,
  headingRef,
  onEdit,
  onRestart,
}: IseeResultProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.result;
  const rows = t.iseeTool.breakdown;
  const nav = t.iseeTool.nav;

  const euro = (value: number) => formatEuro(value, language);
  const minus = (value: number) => (value > 0 ? `-${euro(value)}` : euro(0));
  const light = LIGHT_STYLES[verdict.light];
  const LightIcon = LIGHT_ICONS[verdict.light];

  const bindingNote =
    verdict.iseeLight === verdict.ispeLight
      ? null
      : verdict.light === verdict.iseeLight
        ? copy.bindingIsee
        : copy.bindingIspe;
  const worseNote =
    verdict.worseCities.length > 0
      ? fill(copy.worseNote, { cities: verdict.worseCities.map((key) => copy.cityNames[key]).join(", ") })
      : null;

  const incomePercent = Math.round(result.incomeShare * 100);
  const assetPercent = 100 - incomePercent;

  return (
    <div className="p-5 sm:p-8">
      <h2
        id="isee-wizard-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] outline-none"
      >
        {copy.title}
      </h2>

      <div className={`mt-6 border p-4 ${light.box}`}>
        <div className={`flex items-center gap-3 ${light.text}`}>
          <span className={`h-3 w-3 shrink-0 rounded-full ${light.dot}`} aria-hidden="true" />
          <LightIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-base font-semibold leading-6">{copy.lights[verdict.light].label}</p>
        </div>
        <p className={`mt-2 text-sm leading-6 ${light.text}`}>{copy.lights[verdict.light].body}</p>
        {bindingNote ? <p className={`mt-2 text-sm font-semibold leading-6 ${light.text}`}>{bindingNote}</p> : null}
        {worseNote ? <p className={`mt-2 text-sm font-semibold leading-6 ${light.text}`}>{worseNote}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4">
          <p className="text-sm font-semibold text-[var(--editorial-muted)]">{copy.iseeLabel}</p>
          <p className="mt-1 font-serif text-4xl tracking-[-0.02em] text-[var(--editorial-sage)] tabular-nums">
            {euro(result.isee)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">{copy.iseeHint}</p>
        </div>
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4">
          <p className="text-sm font-semibold text-[var(--editorial-muted)]">{copy.ispeLabel}</p>
          <p className="mt-1 font-serif text-4xl tracking-[-0.02em] text-[var(--editorial-sage)] tabular-nums">
            {euro(result.ispe)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">{copy.ispeHint}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-[var(--editorial-ink)]">
          {fill(copy.citiesTitle, { year: THRESHOLDS_ACADEMIC_YEAR })}
        </h3>
        <p className="mt-1 text-sm leading-6 text-[var(--editorial-muted)]">{copy.citiesHint}</p>
        <ul className="mt-3 divide-y divide-[var(--editorial-border)] border border-[var(--editorial-border)] bg-white">
          {CITY_THRESHOLDS.map((city) => {
            const status = verdict.cities.find((item) => item.key === city.key)?.status ?? "near";
            return (
              <li key={city.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--editorial-ink)]">{copy.cityNames[city.key]}</p>
                  <p className="text-xs leading-5 text-[var(--editorial-muted)] tabular-nums">
                    {copy.iseeShort} {euro(city.iseeLimit)} · {copy.ispeShort} {euro(city.ispeLimit)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${STATUS_STYLES[status]}`}>{copy.status[status]}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-paper)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
          {rows.toggle}
        </summary>
        <div className="space-y-6 border-t border-[var(--editorial-border)] p-4">
          <RowGroup title={rows.incomeTitle}>
            <Row
              label={fill(rows.rate, { year: referenceYear })}
              value={fill(rows.rateValue, { rate: formatAmount(result.rate, language, 4) })}
            />
            <Row label={rows.totalIncome} value={euro(result.totalIncome)} />
            {result.employeeDeduction > 0 ? (
              <Row label={rows.employeeDeduction} value={minus(result.employeeDeduction)} />
            ) : null}
            {result.pensionDeduction > 0 ? (
              <Row label={rows.pensionDeduction} value={minus(result.pensionDeduction)} />
            ) : null}
            {result.rentDeduction > 0 ? (
              <Row
                label={fill(rows.rentDeduction, { cap: euro(result.rentCap) })}
                value={minus(result.rentDeduction)}
              />
            ) : null}
            <Row label={rows.isr} value={euro(result.isr)} strong />
          </RowGroup>

          <RowGroup title={rows.assetsTitle}>
            {result.homeSqm > 0 ? (
              <>
                <Row
                  label={fill(rows.homeValue, { sqm: formatAmount(result.homeSqm, language) })}
                  value={euro(result.homeValue)}
                />
                {result.homeMortgage > 0 ? <Row label={rows.homeMortgage} value={minus(result.homeMortgage)} /> : null}
                <Row label={rows.homeFranchise} value={minus(result.homeFranchise)} />
                <Row label={rows.homeCounted} value={euro(result.homeCounted)} />
              </>
            ) : null}
            {result.otherBuildingsSqm > 0 ? (
              <>
                <Row
                  label={fill(rows.otherValue, { sqm: formatAmount(result.otherBuildingsSqm, language) })}
                  value={euro(result.otherBuildingsValue)}
                />
                {result.otherBuildingsMortgage > 0 ? (
                  <Row label={rows.otherMortgage} value={minus(result.otherBuildingsMortgage)} />
                ) : null}
              </>
            ) : null}
            <Row label={rows.savingsTotal} value={euro(result.savingsTotal)} />
            <Row label={rows.savingsFranchise} value={minus(result.savingsFranchise)} />
            <Row label={rows.savingsNet} value={euro(result.savingsNet)} />
            <Row label={rows.isp} value={euro(result.isp)} strong />
          </RowGroup>

          <RowGroup title={rows.scaleTitle}>
            <Row
              label={fill(rows.scaleBase, { members: result.members })}
              value={formatAmount(result.scaleBase, language, 2)}
            />
            {result.scaleIncrements.map((increment) => (
              <Row
                key={increment.key}
                label={rows.increments[increment.key]}
                value={`+${formatAmount(increment.value, language, 2)}`}
              />
            ))}
            <Row label={rows.scaleTotal} value={formatAmount(result.scale, language, 2)} strong />
          </RowGroup>

          <RowGroup title={rows.formulaTitle}>
            <Row label={rows.ise} value={euro(result.ise)} />
            <Row label={rows.isee} value={euro(result.isee)} strong />
            <Row label={rows.ispe} value={euro(result.ispe)} strong />
          </RowGroup>

          {result.ise > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--editorial-ink)]">{rows.shareTitle}</h4>
              <div className="flex h-3 overflow-hidden border border-[var(--editorial-border)] bg-white" aria-hidden="true">
                <span className="bg-[var(--editorial-sage)]" style={{ width: `${incomePercent}%` }} />
                <span className="bg-[var(--editorial-terracotta)]" style={{ width: `${assetPercent}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-[var(--editorial-muted)]">
                <span>
                  {rows.shareIncome}: %{incomePercent}
                </span>
                <span>
                  {rows.shareAssets}: %{assetPercent}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-6 border border-[#e8c9bd] bg-[#fff8f5] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#8b321a]">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.disclaimerTitle}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#8b321a]">{copy.disclaimer}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--editorial-border)] pt-5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {nav.edit}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-11 items-center border border-[var(--editorial-border)] px-5 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {nav.restart}
        </button>
        <Link
          href="/scholarships"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--editorial-sage)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {copy.scholarshipsLink}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
