import type { Metadata } from "next";

import CommunityLinksExplorer from "@/components/communities/CommunityLinksExplorer";

export const metadata: Metadata = {
  title: "Öğrenci Toplulukları | ItalyPath",
  description:
    "ItalyPath editörleri tarafından seçilen WhatsApp, Telegram ve Facebook öğrenci topluluklarını tek ekranda keşfedin.",
  alternates: {
    canonical: "/communities",
  },
  openGraph: {
    title: "Curated Student Communities | ItalyPath",
    description:
      "Official community listesi değil: editoryal olarak seçilmiş dış öğrenci toplulukları rehberi.",
    url: "https://italypath.com/communities",
    type: "website",
  },
};

export default function CommunitiesPage() {
  return <CommunityLinksExplorer />;
}
