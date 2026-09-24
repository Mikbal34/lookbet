// Ana sayfa önerisinin önizlemesi. Mevcut ana sayfaya dokunmuyor; beğenilirse
// "/" buna geçirilecek. Sayılar her istekte veritabanından.

import type { Metadata } from "next";
import { YeniAnaSayfa } from "@/components/home/yeni-ana-sayfa";
import { aktifOtelSayisi, sehirKartlari } from "@/lib/ana-sayfa-veri";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ana sayfa önizleme — LookBeds",
  robots: { index: false },
};

export default async function AnaSayfaOnizleme() {
  const [sehirler, aktifOtel] = await Promise.all([sehirKartlari(), aktifOtelSayisi()]);
  return <YeniAnaSayfa sehirler={sehirler} aktifOtel={aktifOtel} />;
}
