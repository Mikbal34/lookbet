"use client";

// Onaysız acentenin paneli: başvuru formu (bir kez gönderilir) ya da
// başvurunun durumu. Onaylanınca panel düzeni bunun yerine paneli gösterir.
// Durum sunucuda (lib/acente-durumu) hesaplanır; gönderince sayfa yenilenir.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Ikon } from "@/components/lb/ikon";
import { Nesne } from "@/components/lb/nesne";
import { DESTEK } from "@/components/yardim/makaleler";
import { AYLAR } from "@/components/lb/arama/durum";
import type { AcenteDurumu } from "@/lib/acente-durumu";
import s from "./basvuru.module.css";

type Alan =
  | "contactName" | "phone" | "companyName" | "taxId" | "taxOffice" | "tursabNo"
  | "address" | "companyPhone" | "website" | "message";
type Form = Record<Alan, string>;
const BOS: Form = {
  contactName: "", phone: "", companyName: "", taxId: "", taxOffice: "", tursabNo: "",
  address: "", companyPhone: "", website: "", message: "",
};

/** İstemcide ilk denetim; asıl kurallar sunucuda (acenteBasvuruSchema). */
function denetle(f: Form): Partial<Record<Alan, string>> {
  const h: Partial<Record<Alan, string>> = {};
  const rakam = (v: string) => v.replace(/\D/g, "").length;
  if (f.contactName.trim().length < 3) h.contactName = "Adını ve soyadını yaz";
  if (rakam(f.phone) < 10) h.phone = "Telefon numarası eksik";
  if (f.companyName.trim().length < 2) h.companyName = "Şirket unvanını yaz";
  if (!/^\d{10,11}$/.test(f.taxId.trim())) h.taxId = "Vergi no 10, TC kimlik no 11 hane olmalı";
  if (f.taxOffice.trim().length < 2) h.taxOffice = "Vergi dairesini yaz";
  if (f.address.trim().length < 10) h.address = "Açık adresi yaz";
  return h;
}

const tarihYaz = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
};

export function AcenteBasvuru({ durum }: { durum: Exclude<AcenteDurumu, { tur: "onayli" }> }) {
  if (durum.tur === "basvuru") return <BasvuruFormu />;
  return (
    <div className={s.dis}>
      <div className={s.durum}>
        {durum.tur === "inceleniyor" && (
          <>
            <Nesne ad="anahtar-karti" boyut={120} className={s.durumNesne} />
            <span className={s.rozet}><i />İnceleniyor</span>
            <h1 className="lb-y">Başvurun bizde</h1>
            <p>
              <b>{durum.sirket}</b> için başvurunu {tarihYaz(durum.tarih)} tarihinde aldık. Ekibimiz bilgileri kontrol edip
              onayladığında panelin bu sayfada açılır.
            </p>
            <div className={s.adimlar}>
              <Adim no={1} bitti baslik="Başvuru gönderildi" />
              <Adim no={2} aktif baslik="Bilgiler kontrol ediliyor" aciklama="Vergi ve TÜRSAB kayıtları, anlaşma oranları" />
              <Adim no={3} baslik="Panel açılır" aciklama="Rezervasyon, kazanç ve acente fiyatları" />
            </div>
          </>
        )}
        {durum.tur === "reddedildi" && (
          <>
            <Nesne ad="iptal" boyut={120} className={s.durumNesne} />
            <h1 className="lb-y">Başvurun onaylanmadı</h1>
            <p><b>{durum.sirket}</b> için yaptığın başvuruyu şu an onaylayamadık.</p>
            {durum.sebep && (
              <div className={s.sebep}>
                <b>Sebep</b>
                <span>{durum.sebep}</span>
              </div>
            )}
            <p className={s.soluk}>Eksik bilgiyi tamamlamak ya da yeniden değerlendirme için destek ekibine yaz.</p>
          </>
        )}
        {durum.tur === "kapali" && (
          <>
            <Nesne ad="kilit" boyut={120} className={s.durumNesne} />
            <h1 className="lb-y">Acente hesabın şu an kapalı</h1>
            <p>Hesabın geçici olarak kapatıldı. Açılması için destek ekibiyle görüş.</p>
          </>
        )}
        <div className={s.iletisim}>
          <a className={`${s.dugme} ${s.cerceve}`} href={`mailto:${DESTEK.eposta}`}>
            <Ikon ad="mail" boyut={18} />
            {DESTEK.eposta}
          </a>
          <a className={`${s.dugme} ${s.cerceve}`} href={`tel:${DESTEK.telefon.replace(/\s/g, "")}`}>
            <Ikon ad="phone" boyut={18} />
            {DESTEK.telefon}
          </a>
        </div>
      </div>
    </div>
  );
}

function Adim({ no, baslik, aciklama, bitti, aktif }: { no: number; baslik: string; aciklama?: string; bitti?: boolean; aktif?: boolean }) {
  return (
    <div className={s.adim} data-bitti={bitti || undefined} data-aktif={aktif || undefined}>
      <span>{bitti ? <Ikon ad="check" boyut={14} kalinlik={2.8} /> : no}</span>
      <div>
        <b>{baslik}</b>
        {aciklama && <small>{aciklama}</small>}
      </div>
    </div>
  );
}

function BasvuruFormu() {
  const router = useRouter();
  const { data: oturum } = useSession();
  const [f, setF] = React.useState<Form>(BOS);
  const [hatalar, setHatalar] = React.useState<Partial<Record<Alan, string>>>({});
  const [onay, setOnay] = React.useState(false);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [sunucuHata, setSunucuHata] = React.useState<string | null>(null);

  const degis = (k: Alan, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setHatalar((h) => (h[k] ? { ...h, [k]: undefined } : h));
  };

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = denetle(f);
    setHatalar(h);
    setSunucuHata(null);
    const ilk = Object.keys(h)[0];
    if (ilk) {
      document.getElementById(`b-${ilk}`)?.focus();
      return;
    }
    if (!onay) return setSunucuHata("Bilgilerin doğru olduğunu onayla");
    setGonderiliyor(true);
    try {
      const r = await fetch("/api/agency/basvuru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.details) {
          const sh = Object.fromEntries(Object.entries(d.details as Record<string, string[]>).map(([k, v]) => [k, v[0]]));
          setHatalar(sh);
        }
        setSunucuHata(d.error ?? "Başvuru gönderilemedi, tekrar dene");
        return;
      }
      router.refresh();
    } catch {
      setSunucuHata("Başvuru gönderilemedi, bağlantını kontrol et");
    } finally {
      setGonderiliyor(false);
    }
  };

  const girdi = (k: Alan, etiket: string, ek?: React.InputHTMLAttributes<HTMLInputElement> & { not?: string }) => {
    const { not, ...kalan } = ek ?? {};
    return (
      <div className={s.alanKap}>
        <div className={s.alan} data-hatali={!!hatalar[k] || undefined}>
          <label htmlFor={`b-${k}`}>{etiket}</label>
          <input
            id={`b-${k}`}
            value={f[k]}
            onChange={(e) => degis(k, e.target.value)}
            aria-invalid={!!hatalar[k] || undefined}
            aria-describedby={hatalar[k] ? `b-${k}-h` : undefined}
            {...kalan}
          />
        </div>
        {hatalar[k] ? (
          <small className={s.hata} id={`b-${k}-h`}><Ikon ad="warning" boyut={15} kalinlik={2.1} />{hatalar[k]}</small>
        ) : (
          not && <small className={s.not}>{not}</small>
        )}
      </div>
    );
  };

  return (
    <div className={s.dis}>
      <div className={s.bas}>
        <h1 className="lb-y">LookBeds Partner başvurusu</h1>
        <p>Şirketini tanıyalım. Başvurun onaylanınca acente fiyatları, rezervasyon ve kazanç paneli açılır.</p>
      </div>
      <div className={s.duzen}>
        <form className={s.form} onSubmit={gonder} noValidate>
          <section>
            <h2>Yetkili kişi</h2>
            <div className={s.iki}>
              {girdi("contactName", "Ad soyad", { autoComplete: "name" })}
              {girdi("phone", "Cep telefonu", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "+90 5XX XXX XX XX" })}
            </div>
            <div className={s.sabit}>
              <Ikon ad="mail" boyut={18} />
              <div>
                <b>{oturum?.user?.email}</b>
                <span>Giriş yaptığın e-posta; başvuru ve panel bu adrese bağlanır.</span>
              </div>
            </div>
          </section>

          <section>
            <h2>Şirket</h2>
            {girdi("companyName", "Şirket unvanı", { autoComplete: "organization", not: "Vergi levhasındaki unvan" })}
            <div className={s.iki}>
              {girdi("taxId", "Vergi no / TC kimlik no", { inputMode: "numeric", maxLength: 11 })}
              {girdi("taxOffice", "Vergi dairesi")}
            </div>
            {girdi("tursabNo", "TÜRSAB belge no (isteğe bağlı)", { inputMode: "numeric", maxLength: 20 })}
          </section>

          <section>
            <h2>Adres ve iletişim</h2>
            {girdi("address", "Açık adres", { autoComplete: "street-address" })}
            <div className={s.iki}>
              {girdi("companyPhone", "Şirket telefonu (isteğe bağlı)", { type: "tel", inputMode: "tel" })}
              {girdi("website", "Web sitesi (isteğe bağlı)", { type: "url", inputMode: "url", placeholder: "ornekturizm.com" })}
            </div>
          </section>

          <section>
            <h2>Eklemek istediğin</h2>
            <div className={s.alanKap}>
              <div className={s.alan}>
                <label htmlFor="b-message">Not (isteğe bağlı)</label>
                <textarea
                  id="b-message"
                  maxLength={1000}
                  value={f.message}
                  onChange={(e) => degis("message", e.target.value)}
                  placeholder="Çalıştığın bölgeler, aylık tahmini rezervasyon sayısı…"
                />
              </div>
              <small className={s.not}>{f.message.length} / 1000</small>
            </div>
          </section>

          <div className={s.gonder}>
            <label className={s.onay}>
              <input type="checkbox" checked={onay} onChange={(e) => { setOnay(e.target.checked); setSunucuHata(null); }} />
              <span>
                Bilgilerin doğru olduğunu onaylıyorum. Başvuru bir kez gönderilir; sonradan değişiklik için{" "}
                <Link href="/yardim?kitle=acente">destek ekibine</Link> yazarım.
              </span>
            </label>
            {sunucuHata && (
              <small className={s.hata} role="alert"><Ikon ad="warning" boyut={15} kalinlik={2.1} />{sunucuHata}</small>
            )}
            <button type="submit" className={`${s.dugme} ${s.turuncu} ${s.buyuk}`} disabled={gonderiliyor}>
              {gonderiliyor ? "Gönderiliyor…" : "Başvuruyu gönder"}
            </button>
          </div>
        </form>

        <aside className={s.yan}>
          <Nesne ad="anahtar-karti" boyut={64} />
          <b>Nasıl işliyor?</b>
          <ol>
            <li><span>1</span><div><b>Başvurunu gönder</b><small>Şirket ve vergi bilgilerin yeterli.</small></div></li>
            <li><span>2</span><div><b>Kontrol ediyoruz</b><small>Kayıtlarını ve anlaşma oranlarını belirliyoruz.</small></div></li>
            <li><span>3</span><div><b>Panelin açılır</b><small>Acente fiyatlarıyla rezervasyon yapar, kazancını takip edersin.</small></div></li>
          </ol>
          <p>Sorun mu var? <a href={`mailto:${DESTEK.eposta}`}>{DESTEK.eposta}</a></p>
        </aside>
      </div>
    </div>
  );
}
