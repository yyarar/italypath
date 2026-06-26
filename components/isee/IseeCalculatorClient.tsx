"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  FileText,
  Home,
  Info,
  Landmark,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { calculateIsee, type IseeInput } from "@/lib/iseeCalculator";

type Copy = {
  back: string;
  title: string;
  subtitle: string;
  formulaLabel: string;
  liveEstimate: string;
  scaleLabel: string;
  universityStatus: string;
  autonomous: string;
  originFamily: string;
  universityHint: string;
  sections: {
    household: string;
    householdDesc: string;
    income: string;
    incomeDesc: string;
    housing: string;
    housingDesc: string;
    assets: string;
    assetsDesc: string;
  };
  fields: Record<string, string>;
  yes: string;
  no: string;
  resultTitle: string;
  resultSubtitle: string;
  breakdown: string;
  sources: string;
  disclaimer: string;
  reset: string;
  live: string;
  euro: string;
  people: string;
  sourceLinks: string;
};

const COPY: Record<"tr" | "en", Copy> = {
  tr: {
    back: "Ana sayfaya dön",
    title: "Burs dosyan için ISEE hesabı",
    subtitle:
      "İtalya'daki burs ve harç indirimi başvurularında kullanılan ISEE mantığını aynı ItalyPath diliyle, kalem kalem ve şeffaf biçimde gör.",
    formulaLabel: "Hesap omurgası",
    liveEstimate: "Canlı tahmin",
    scaleLabel: "Scala",
    universityStatus: "Üniversite statüsü",
    autonomous: "Özerk öğrenci gibi görünüyor",
    originFamily: "Aile çekirdeği gerekir",
    universityHint:
      "ISEE Università için öğrenci en az 2 yıldır aile konutu dışında ve yeterli gelire sahipse özerk sayılır; aksi halde ebeveyn çekirdeği dahil edilir.",
    sections: {
      household: "Hane",
      householdDesc: "Scala di equivalenza ve üniversite çekirdeği",
      income: "Gelir",
      incomeDesc: "ISR için gelirler ve indirilecek kalemler",
      housing: "Konut",
      housingDesc: "Kira veya ana konut patrimony indirimi",
      assets: "Patrimony",
      assetsDesc: "Taşınır ve taşınmaz varlıklar",
    },
    fields: {
      members: "Hane kişi sayısı",
      children: "Çocuk sayısı",
      childrenUnderThree: "3 yaş altı çocuk",
      hasMinorChildren: "Hanede reşit olmayan çocuk var",
      parentsWorked: "İki ebeveyn / tek ebeveyn en az 6 ay çalıştı",
      disabilityMembers: "Engelli veya bakıma muhtaç kişi",
      studentAway: "Öğrenci en az 2 yıldır aile konutu dışında",
      studentIncome: "Öğrencinin yıllık geliri 9.000 EUR eşiğini karşılıyor",
      totalIncome: "Toplam DSU geliri",
      financialYieldRate: "Finansal getiri oranı",
      employeeEarners: "Çalışan sayısı",
      employeeIncome: "Çalışan geliri",
      pensionEarners: "Emekli gelir sahibi sayısı",
      pensionIncome: "Emekli geliri",
      maintenancePaid: "Ödenen nafaka",
      disabilityExpenses: "İndirilebilir sağlık/bakım gideri",
      annualRent: "Yıllık kira",
      ownedMainResidence: "Ana konut mülk",
      mainResidenceValue: "Ana konut IMU değeri",
      mainResidenceMortgage: "Ana konut kalan kredi",
      bankBalances: "Banka/posta hesap bakiyesi",
      bankAverageStock: "Yıllık ortalama bakiye",
      accountAssetPurchases: "Yıl içi varlık alışı",
      otherFinancialAssets: "Diğer finansal varlık",
      stateBackedSavings: "BTP / buoni / libretti",
      otherRealEstateValue: "Diğer taşınmaz değeri",
      otherRealEstateMortgage: "Diğer taşınmaz kalan kredi",
    },
    yes: "Evet",
    no: "Hayır",
    resultTitle: "Hesaplanan ISEE",
    resultSubtitle: "ISEE = ISE / scala",
    breakdown: "Hesap dökümü",
    sources: "Kaynak mantığı",
    disclaimer:
      "Bu ekran resmi attestazione üretmez. Resmi değer INPS/CAF üzerinden DSU doğrulamasıyla verilir; burada formül ve kalem ayrımı şeffaflaştırılır.",
    reset: "Varsayılana dön",
    live: "Değişiklikler anında hesaplanır",
    euro: "EUR",
    people: "kişi",
    sourceLinks: "Resmi referanslar",
  },
  en: {
    back: "Back home",
    title: "Estimate ISEE for your scholarship file",
    subtitle:
      "Understand the ISEE logic used for Italian scholarships and tuition reductions in the same ItalyPath editorial language, line by line.",
    formulaLabel: "Calculation spine",
    liveEstimate: "Live estimate",
    scaleLabel: "Scale",
    universityStatus: "University status",
    autonomous: "Likely autonomous student",
    originFamily: "Origin family likely required",
    universityHint:
      "For ISEE Università, the student is autonomous only when they have lived outside the origin home for at least two years and meet the adequate income threshold; otherwise parental household data is included.",
    sections: {
      household: "Household",
      householdDesc: "Equivalence scale and university household",
      income: "Income",
      incomeDesc: "Income and deductions for ISR",
      housing: "Housing",
      housingDesc: "Rent or main-residence asset deduction",
      assets: "Assets",
      assetsDesc: "Movable and real-estate assets",
    },
    fields: {
      members: "Household members",
      children: "Children",
      childrenUnderThree: "Children under 3",
      hasMinorChildren: "Household has minor children",
      parentsWorked: "Both parents / the only parent worked at least 6 months",
      disabilityMembers: "Disabled or non-self-sufficient members",
      studentAway: "Student has lived away from origin home for 2+ years",
      studentIncome: "Student meets the 9,000 EUR yearly income threshold",
      totalIncome: "Total DSU income",
      financialYieldRate: "Financial yield rate",
      employeeEarners: "Employee earners",
      employeeIncome: "Employee income",
      pensionEarners: "Pension earners",
      pensionIncome: "Pension income",
      maintenancePaid: "Maintenance paid",
      disabilityExpenses: "Deductible care/health expenses",
      annualRent: "Annual rent",
      ownedMainResidence: "Owned main residence",
      mainResidenceValue: "Main residence IMU value",
      mainResidenceMortgage: "Main residence mortgage",
      bankBalances: "Bank/postal account balances",
      bankAverageStock: "Average yearly stock",
      accountAssetPurchases: "Asset purchases during year",
      otherFinancialAssets: "Other financial assets",
      stateBackedSavings: "BTP / bonds / postal savings",
      otherRealEstateValue: "Other real-estate value",
      otherRealEstateMortgage: "Other real-estate mortgage",
    },
    yes: "Yes",
    no: "No",
    resultTitle: "Calculated ISEE",
    resultSubtitle: "ISEE = ISE / scale",
    breakdown: "Calculation breakdown",
    sources: "Formula basis",
    disclaimer:
      "This screen does not issue an official attestation. The official value is produced through INPS/CAF DSU verification; this tool makes the formula and components transparent.",
    reset: "Reset defaults",
    live: "Changes update instantly",
    euro: "EUR",
    people: "people",
    sourceLinks: "Official references",
  },
};

type FormState = {
  members: number;
  children: number;
  childrenUnderThree: number;
  hasMinorChildren: boolean;
  bothParentsWorkedOrSingleParentWorked: boolean;
  disabilityMembers: number;
  studentAwayTwoYears: boolean;
  studentAdequateIncome: boolean;
  taxableAndExemptIncome: number;
  financialYieldRatePercent: number;
  employeeIncomes: number[];
  pensionIncomes: number[];
  maintenancePaid: number;
  disabilityExpenses: number;
  annualRent: number;
  ownedMainResidence: boolean;
  mainResidenceValue: number;
  mainResidenceMortgage: number;
  bankBalances: number;
  bankAverageStock: number;
  accountAssetPurchases: number;
  otherFinancialAssets: number;
  stateBackedSavings: number;
  otherRealEstateValue: number;
  otherRealEstateMortgage: number;
};

const DEFAULT_FORM: FormState = {
  members: 3,
  children: 1,
  childrenUnderThree: 0,
  hasMinorChildren: true,
  bothParentsWorkedOrSingleParentWorked: false,
  disabilityMembers: 0,
  studentAwayTwoYears: false,
  studentAdequateIncome: false,
  taxableAndExemptIncome: 30_000,
  financialYieldRatePercent: 0,
  employeeIncomes: [20_000],
  pensionIncomes: [5_000],
  maintenancePaid: 0,
  disabilityExpenses: 0,
  annualRent: 8_400,
  ownedMainResidence: false,
  mainResidenceValue: 0,
  mainResidenceMortgage: 0,
  bankBalances: 15_000,
  bankAverageStock: 12_000,
  accountAssetPurchases: 0,
  otherFinancialAssets: 10_000,
  stateBackedSavings: 30_000,
  otherRealEstateValue: 50_000,
  otherRealEstateMortgage: 0,
};

function toEuro(value: number, locale: string, digits = 0) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function toNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--editorial-border)] bg-[#f5f1e8]/60 px-5 py-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-sage)]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--editorial-ink)]">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-[var(--editorial-muted)]">{description}</p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="grid min-w-0 gap-2 border-b border-[var(--editorial-border)] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
      <span className="text-sm font-medium text-[var(--editorial-ink)]">{label}</span>
      <span className="flex min-w-0 items-center border border-[var(--editorial-border)] bg-white focus-within:border-[var(--editorial-sage)] focus-within:ring-2 focus-within:ring-[var(--editorial-sage-soft)]">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-semibold text-[var(--editorial-ink)] outline-none"
        />
        {suffix ? (
          <span className="flex h-10 min-w-10 items-center justify-center border-l border-[var(--editorial-border)] px-2 text-xs font-semibold text-[var(--editorial-muted)]">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  yes,
  no,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-[var(--editorial-border)] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
      <p className="text-sm font-medium text-[var(--editorial-ink)]">{label}</p>
      <div className="grid grid-cols-2 border border-[var(--editorial-border)] bg-white p-0.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`h-9 text-sm font-semibold transition ${checked ? "bg-[var(--editorial-sage)] text-white" : "text-[var(--editorial-muted)] hover:bg-[var(--editorial-paper)]"}`}
          aria-pressed={checked}
        >
          {yes}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`h-9 text-sm font-semibold transition ${!checked ? "bg-[var(--editorial-sage)] text-white" : "text-[var(--editorial-muted)] hover:bg-[var(--editorial-paper)]"}`}
          aria-pressed={!checked}
        >
          {no}
        </button>
      </div>
    </div>
  );
}

function EarnersEditor({
  title,
  values,
  onChange,
  suffix,
}: {
  title: string;
  values: number[];
  onChange: (values: number[]) => void;
  suffix: string;
}) {
  const setCount = (count: number) => {
    const normalizedCount = Math.max(0, Math.min(8, Math.floor(count)));
    const next = Array.from({ length: normalizedCount }, (_, index) => values[index] ?? 0);
    onChange(next);
  };

  return (
    <div className="border-b border-[var(--editorial-border)] px-5 py-4 last:border-b-0">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
        <p className="text-sm font-medium text-[var(--editorial-ink)]">{title}</p>
        <span className="flex items-center border border-[var(--editorial-border)] bg-white">
          <input
            type="number"
            min={0}
            max={8}
            value={values.length}
            onChange={(event) => setCount(Number(event.target.value))}
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-semibold text-[var(--editorial-ink)] outline-none"
          />
          <span className="flex h-10 min-w-10 items-center justify-center border-l border-[var(--editorial-border)] px-2 text-xs font-semibold text-[var(--editorial-muted)]">
            {suffix}
          </span>
        </span>
      </div>
      {values.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {values.map((value, index) => (
            <label key={index} className="flex items-center border border-[var(--editorial-border)] bg-white">
              <span className="w-10 border-r border-[var(--editorial-border)] text-center text-xs font-semibold text-[var(--editorial-muted)]">
                {index + 1}
              </span>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = Number(event.target.value);
                  onChange(next);
                }}
                className="h-10 min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-semibold text-[var(--editorial-ink)] outline-none"
              />
              <span className="flex h-10 min-w-10 items-center justify-center border-l border-[var(--editorial-border)] px-2 text-xs font-semibold text-[var(--editorial-muted)]">
                EUR
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BreakdownLine({
  label,
  value,
  valueText,
  strong = false,
  danger = false,
  locale,
}: {
  label: string;
  value: number;
  valueText?: string;
  strong?: boolean;
  danger?: boolean;
  locale: string;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--editorial-border)] px-3 py-2 last:border-b-0 ${
        strong ? "bg-[var(--editorial-sage-soft)]/55 font-semibold text-[var(--editorial-ink)]" : "text-[var(--editorial-muted)]"
      } ${danger ? "bg-[#f5d9cf] text-[#8b321a]" : ""}`}
    >
      <span className="min-w-0 truncate text-sm">{label}</span>
      <span className="text-sm tabular-nums">{valueText ?? toEuro(value, locale, strong ? 0 : 2)}</span>
    </div>
  );
}

export default function IseeCalculatorClient() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const employeeIncome = form.employeeIncomes.reduce((sum, value) => sum + value, 0);
  const pensionIncome = form.pensionIncomes.reduce((sum, value) => sum + value, 0);
  const isStudentAutonomous = form.studentAwayTwoYears && form.studentAdequateIncome;

  const input: IseeInput = useMemo(
    () => ({
      members: form.members,
      children: Math.min(form.children, form.members),
      childrenUnderThree: Math.min(form.childrenUnderThree, form.children),
      hasMinorChildren: form.hasMinorChildren,
      bothParentsWorkedOrSingleParentWorked: form.bothParentsWorkedOrSingleParentWorked,
      disabilityMembers: Math.min(form.disabilityMembers, form.members),
      income: {
        taxableAndExemptIncome: form.taxableAndExemptIncome,
        employeeIncome,
        employeeEarners: form.employeeIncomes.length,
        employeeIncomes: form.employeeIncomes,
        pensionIncome,
        pensionEarners: form.pensionIncomes.length,
        pensionIncomes: form.pensionIncomes,
        maintenancePaid: form.maintenancePaid,
        disabilityExpenses: form.disabilityExpenses,
        annualRent: form.annualRent,
        financialYieldRate: form.financialYieldRatePercent / 100,
      },
      assets: {
        bankBalances: form.bankBalances,
        bankAverageStock: form.bankAverageStock,
        accountAssetPurchases: form.accountAssetPurchases,
        otherFinancialAssets: form.otherFinancialAssets,
        stateBackedSavings: form.stateBackedSavings,
        otherRealEstateValue: form.otherRealEstateValue,
        otherRealEstateMortgage: form.otherRealEstateMortgage,
        mainResidenceValue: form.mainResidenceValue,
        mainResidenceMortgage: form.mainResidenceMortgage,
        ownedMainResidence: form.ownedMainResidence,
      },
    }),
    [employeeIncome, form, pensionIncome],
  );

  const result = useMemo(() => calculateIsee(input), [input]);

  const setField = <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 pb-40 pt-7 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>

        <header className="mt-7 grid gap-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 shadow-[0_18px_50px_rgba(21,32,28,0.08)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:p-10">
          <div className="min-w-0 self-center">
            <p className="mb-5 text-sm font-medium text-[var(--editorial-muted)]">ItalyPath ISEE</p>
            <h1 className="max-w-4xl font-serif text-5xl font-normal leading-[0.98] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-6xl lg:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">{copy.subtitle}</p>
            <div className="mt-8 grid max-w-2xl grid-cols-3 border-y border-[var(--editorial-border)] text-sm">
              {[
                ["ISR", "reddito"],
                ["ISP", "patrimonio"],
                ["Scala", "equivalenza"],
              ].map(([value, label]) => (
                <div key={value} className="py-4 pr-4">
                  <p className="text-2xl font-semibold tracking-[-0.02em] text-[var(--editorial-ink)]">{value}</p>
                  <p className="mt-1 text-xs text-[var(--editorial-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[var(--editorial-border)] bg-[#f5f1e8] p-5">
            <div className="mb-5 flex items-center justify-between border-b border-[var(--editorial-border)] pb-4">
              <div>
                <p className="text-xs font-semibold text-[var(--editorial-muted)]">{copy.formulaLabel}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-[var(--editorial-ink)]">ISEE 2026</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-sage)]">
                <Calculator className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
                <p className="font-mono text-sm font-semibold text-[var(--editorial-ink)]">
                  ISEE = (ISR + 20% x ISP) / Scala
                </p>
              </div>
              <div className="hidden grid-cols-2 gap-3 sm:grid">
                <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
                  <p className="text-xs font-semibold text-[var(--editorial-muted)]">{copy.liveEstimate}</p>
                  <p className="mt-1 font-serif text-3xl text-[var(--editorial-sage)]">{toEuro(result.isee, locale, 0)}</p>
                </div>
                <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
                  <p className="text-xs font-semibold text-[var(--editorial-muted)]">{copy.scaleLabel}</p>
                  <p className="mt-1 font-serif text-3xl text-[var(--editorial-terracotta)]">{toNumber(result.scale, locale)}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_12px_36px_rgba(21,32,28,0.05)]">
              <SectionHeader
                icon={<Users className="h-5 w-5" />}
                title={copy.sections.household}
                description={copy.sections.householdDesc}
              />
              <NumberField label={copy.fields.members} value={form.members} onChange={(value) => setField("members", value)} suffix={copy.people} min={1} />
              <NumberField label={copy.fields.children} value={form.children} onChange={(value) => setField("children", value)} suffix={copy.people} />
              <NumberField
                label={copy.fields.childrenUnderThree}
                value={form.childrenUnderThree}
                onChange={(value) => setField("childrenUnderThree", value)}
                suffix={copy.people}
              />
              <NumberField
                label={copy.fields.disabilityMembers}
                value={form.disabilityMembers}
                onChange={(value) => setField("disabilityMembers", value)}
                suffix={copy.people}
              />
              <ToggleRow
                label={copy.fields.hasMinorChildren}
                checked={form.hasMinorChildren}
                onChange={(value) => setField("hasMinorChildren", value)}
                yes={copy.yes}
                no={copy.no}
              />
              <ToggleRow
                label={copy.fields.parentsWorked}
                checked={form.bothParentsWorkedOrSingleParentWorked}
                onChange={(value) => setField("bothParentsWorkedOrSingleParentWorked", value)}
                yes={copy.yes}
                no={copy.no}
              />
              <ToggleRow
                label={copy.fields.studentAway}
                checked={form.studentAwayTwoYears}
                onChange={(value) => setField("studentAwayTwoYears", value)}
                yes={copy.yes}
                no={copy.no}
              />
              <ToggleRow
                label={copy.fields.studentIncome}
                checked={form.studentAdequateIncome}
                onChange={(value) => setField("studentAdequateIncome", value)}
                yes={copy.yes}
                no={copy.no}
              />
            </section>

            <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_12px_36px_rgba(21,32,28,0.05)]">
              <SectionHeader
                icon={<ReceiptText className="h-5 w-5" />}
                title={copy.sections.income}
                description={copy.sections.incomeDesc}
              />
              <NumberField
                label={copy.fields.totalIncome}
                value={form.taxableAndExemptIncome}
                onChange={(value) => setField("taxableAndExemptIncome", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.financialYieldRate}
                value={form.financialYieldRatePercent}
                onChange={(value) => setField("financialYieldRatePercent", value)}
                suffix="%"
                step={0.1}
              />
              <EarnersEditor
                title={copy.fields.employeeEarners}
                values={form.employeeIncomes}
                onChange={(values) => setField("employeeIncomes", values)}
                suffix={copy.people}
              />
              <EarnersEditor
                title={copy.fields.pensionEarners}
                values={form.pensionIncomes}
                onChange={(values) => setField("pensionIncomes", values)}
                suffix={copy.people}
              />
              <NumberField label={copy.fields.maintenancePaid} value={form.maintenancePaid} onChange={(value) => setField("maintenancePaid", value)} suffix={copy.euro} />
              <NumberField
                label={copy.fields.disabilityExpenses}
                value={form.disabilityExpenses}
                onChange={(value) => setField("disabilityExpenses", value)}
                suffix={copy.euro}
              />
            </section>

            <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_12px_36px_rgba(21,32,28,0.05)]">
              <SectionHeader
                icon={<Home className="h-5 w-5" />}
                title={copy.sections.housing}
                description={copy.sections.housingDesc}
              />
              <NumberField label={copy.fields.annualRent} value={form.annualRent} onChange={(value) => setField("annualRent", value)} suffix={copy.euro} />
              <ToggleRow
                label={copy.fields.ownedMainResidence}
                checked={form.ownedMainResidence}
                onChange={(value) => setField("ownedMainResidence", value)}
                yes={copy.yes}
                no={copy.no}
              />
              <NumberField
                label={copy.fields.mainResidenceValue}
                value={form.mainResidenceValue}
                onChange={(value) => setField("mainResidenceValue", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.mainResidenceMortgage}
                value={form.mainResidenceMortgage}
                onChange={(value) => setField("mainResidenceMortgage", value)}
                suffix={copy.euro}
              />
            </section>

            <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_12px_36px_rgba(21,32,28,0.05)]">
              <SectionHeader
                icon={<Wallet className="h-5 w-5" />}
                title={copy.sections.assets}
                description={copy.sections.assetsDesc}
              />
              <NumberField label={copy.fields.bankBalances} value={form.bankBalances} onChange={(value) => setField("bankBalances", value)} suffix={copy.euro} />
              <NumberField
                label={copy.fields.bankAverageStock}
                value={form.bankAverageStock}
                onChange={(value) => setField("bankAverageStock", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.accountAssetPurchases}
                value={form.accountAssetPurchases}
                onChange={(value) => setField("accountAssetPurchases", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.otherFinancialAssets}
                value={form.otherFinancialAssets}
                onChange={(value) => setField("otherFinancialAssets", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.stateBackedSavings}
                value={form.stateBackedSavings}
                onChange={(value) => setField("stateBackedSavings", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.otherRealEstateValue}
                value={form.otherRealEstateValue}
                onChange={(value) => setField("otherRealEstateValue", value)}
                suffix={copy.euro}
              />
              <NumberField
                label={copy.fields.otherRealEstateMortgage}
                value={form.otherRealEstateMortgage}
                onChange={(value) => setField("otherRealEstateMortgage", value)}
                suffix={copy.euro}
              />
            </section>
          </div>

          <aside className="lg:sticky lg:top-6">
            <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_18px_50px_rgba(21,32,28,0.08)]">
              <div className="border-b border-[var(--editorial-border)] p-6 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center border border-[var(--editorial-border)] bg-[#f5f1e8] text-[var(--editorial-sage)]">
                  <Calculator className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[var(--editorial-muted)]">{copy.resultTitle}</p>
                <p className="mt-2 font-serif text-5xl font-normal tracking-[-0.025em] text-[var(--editorial-sage)]">
                  {toEuro(result.isee, locale, 0)}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--editorial-muted)]">{copy.resultSubtitle}</p>
              </div>

              <div className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-5 py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center font-mono text-sm">
                  <span className="truncate font-semibold text-[var(--editorial-sage)]">ISEE</span>
                  <span className="text-[var(--editorial-muted)]">=</span>
                  <span className="truncate text-[var(--editorial-ink)]">{toNumber(result.ise, locale)}</span>
                  <span className="text-[var(--editorial-muted)]">/</span>
                  <span className="truncate text-[var(--editorial-ink)]">{toNumber(result.scale, locale)}</span>
                </div>
              </div>

              <div className="border-b border-[var(--editorial-border)] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-[var(--editorial-ink)]">{copy.breakdown}</h2>
                  <span className="text-xs font-medium text-[var(--editorial-muted)]">{copy.euro}</span>
                </div>
                <div className="overflow-hidden border border-[var(--editorial-border)] bg-white">
                  <BreakdownLine label="ISR" value={result.isr} strong locale={locale} />
                  <BreakdownLine label="Gelir toplamı / total income" value={result.totalIncome} locale={locale} />
                  <BreakdownLine label="Finansal getiri / financial yield" value={result.financialYield} locale={locale} />
                  <BreakdownLine label="Lavoro detrazione" value={-result.employeeDeduction} locale={locale} />
                  <BreakdownLine label="Pensione detrazione" value={-result.pensionDeduction} locale={locale} />
                  <BreakdownLine label="Kira detrazione" value={-result.rentDeduction} locale={locale} />
                  <BreakdownLine label="ISP" value={result.isp} strong locale={locale} />
                  <BreakdownLine label="Patrimonio mobiliare lordo" value={result.mobileAssetsGross} locale={locale} />
                  <BreakdownLine label="BTP/buoni/libretti esclusi" value={result.protectedStateSavings} locale={locale} />
                  <BreakdownLine label="Franchigia mobiliare" value={-result.mobileAssetDeduction} locale={locale} />
                  <BreakdownLine label="Patrimonio immobiliare netto" value={result.realEstateAssetsNet} locale={locale} />
                  <BreakdownLine label="ISE = ISR + 20% ISP" value={result.ise} strong locale={locale} />
                  <BreakdownLine label="Scala di equivalenza" value={result.scale} valueText={toNumber(result.scale, locale)} locale={locale} />
                  <BreakdownLine label="ISEE" value={result.isee} strong danger locale={locale} />
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="border border-[var(--editorial-border)] bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
                    {isStudentAutonomous ? <CheckCircle2 className="h-4 w-4 text-[var(--editorial-sage)]" /> : <Info className="h-4 w-4 text-[var(--editorial-terracotta)]" />}
                    {copy.universityStatus}
                  </div>
                  <p className="text-sm leading-6 text-[var(--editorial-muted)]">
                    {isStudentAutonomous ? copy.autonomous : copy.originFamily}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">{copy.universityHint}</p>
                </div>

                <div className="border border-[#e8c9bd] bg-[#fff8f5] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#8b321a]">
                    <AlertTriangle className="h-4 w-4" />
                    {copy.sources}
                  </div>
                  <p className="text-sm leading-6 text-[#8b321a]">{copy.disclaimer}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--editorial-border)] pt-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--editorial-muted)]">
                    <FileText className="h-4 w-4" />
                    {copy.live}
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm(DEFAULT_FORM)}
                    className="border border-[var(--editorial-border)] px-4 py-2 text-sm font-semibold text-[var(--editorial-sage)] transition hover:border-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    {copy.reset}
                  </button>
                </div>

                <div className="border-t border-[var(--editorial-border)] pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                    {copy.sourceLinks}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <a
                      href="https://www.lavoro.gov.it/strumenti-e-servizi/isee-istruzioni-2026"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-[var(--editorial-border)] px-3 py-2 text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)]"
                    >
                      DSU 2026
                      <Landmark className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://servizi2.inps.it/servizi/Iseeriforma/docs/info/Guide/INPS%20Riforma%20ISEE.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-[var(--editorial-border)] px-3 py-2 text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)]"
                    >
                      INPS formula
                      <Landmark className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2025.04.isee-e-dsu-nuove-regole-dal-3-aprile-2025.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-[var(--editorial-border)] px-3 py-2 text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)]"
                    >
                      2025 assets
                      <Landmark className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-3 shadow-[0_16px_40px_rgba(21,32,28,0.14)] lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">ISEE</p>
            <p className="truncate font-serif text-2xl text-[var(--editorial-sage)]">{toEuro(result.isee, locale, 0)}</p>
          </div>
          <p className="font-mono text-xs text-[var(--editorial-muted)]">ISE {toNumber(result.ise, locale)} / {toNumber(result.scale, locale)}</p>
        </div>
      </div>
    </div>
  );
}
