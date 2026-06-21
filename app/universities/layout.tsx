import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İtalya İngilizce Üniversite Programları | ItalyPath",
  description:
    "İtalya’daki İngilizce lisans, yüksek lisans ve single-cycle programları şehir, okul türü ve kabul detaylarıyla keşfedin.",
  alternates: {
    canonical: "/universities",
  },
};

export default function UniversitiesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
