import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISEE Hesaplayıcı | İtalya Burs ve Harç Tahmini",
  description:
    "İtalya’da burs ve harç indirimi başvuruları için tahmini ISEE değerinizi hesaplayın.",
  alternates: {
    canonical: "/isee",
  },
};

export default function IseeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
