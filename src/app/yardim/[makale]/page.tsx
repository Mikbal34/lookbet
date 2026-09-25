import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MakaleSayfasi } from "@/components/yardim/makale-sayfasi";
import { MAKALELER, makaleBul } from "@/components/yardim/makaleler";

export function generateStaticParams() {
  return MAKALELER.map((m) => ({ makale: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ makale: string }> }): Promise<Metadata> {
  const m = makaleBul((await params).makale);
  return m ? { title: `${m.baslik} — LookBeds Yardım`, description: m.metin[0] } : {};
}

export default async function MakaleSayfa({ params }: { params: Promise<{ makale: string }> }) {
  const m = makaleBul((await params).makale);
  if (!m) notFound();
  return <MakaleSayfasi m={m} />;
}
