"use client";

// Tam sayfa durum: bulunamadı (not-found) ve beklenmeyen hata (error).
import Link from "next/link";
import { Nesne, type NesneAdi } from "./nesne";
import s from "./durum-sayfasi.module.css";

export function DurumSayfasi({ nesne, baslik, metin, anaSayfa, tekrar }: {
  nesne: NesneAdi;
  baslik: string;
  metin: string;
  anaSayfa: string;
  tekrar?: { metin: string; onClick: () => void };
}) {
  return (
    <main className={`lb ${s.sayfa}`}>
      <div className={s.icerik}>
        <Nesne ad={nesne} boyut={110} />
        <h1 className="lb-y">{baslik}</h1>
        <p>{metin}</p>
        <div className={s.dugmeler}>
          {tekrar && (
            <button type="button" className={s.dugme} data-siyah onClick={tekrar.onClick}>{tekrar.metin}</button>
          )}
          <Link href="/" className={s.dugme} data-siyah={tekrar ? undefined : true}>{anaSayfa}</Link>
        </div>
      </div>
    </main>
  );
}
