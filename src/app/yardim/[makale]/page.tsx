import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { MakaleSayfasi } from "@/components/yardim/makale-sayfasi";
import { MAKALELER, makaleBul, makaleKur } from "@/components/yardim/makaleler";

export function generateStaticParams() {
  return MAKALELER.map((m) => ({ makale: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ makale: string }> }): Promise<Metadata> {
  const kayit = makaleBul((await params).makale);
  if (!kayit) return {};
  const [t, mesajlar] = await Promise.all([getTranslations("yardim.meta"), getMessages()]);
  const m = makaleKur(kayit, mesajlar.yardim.makale);
  return { title: t("makale", { baslik: m.baslik }), description: m.metin[0] };
}

export default async function MakaleSayfa({ params }: { params: Promise<{ makale: string }> }) {
  const kayit = makaleBul((await params).makale);
  if (!kayit) notFound();
  return <MakaleSayfasi kayit={kayit} />;
}
