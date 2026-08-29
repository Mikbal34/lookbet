// LookBeds ikon seti.
//
// Bir ikon setini "bizim" yapan şey yeni semboller uydurmak değil — yatak
// yatak, telefon telefondur — tek bir çizim gramerine uymalarıdır. Buradaki
// gramer logodan çıkarıldı: logo yuvarlak uçlu kalın çubuklardan kuruluyor
// (rect'lerin rx'i genişliğin yarısı) ve yazı yığını da yuvarlak bir harf
// formu istiyor (Arial Rounded → Nunito → Quicksand).
//
// Kurallar, hepsi istisnasız:
//   • 24×24 kutu, içerik 4–20 arasında (2px optik pay)
//   • stroke 2.25, fill yok
//   • linecap ve linejoin: round — logonun yuvarlak uçları
//   • köşe yarıçapı en az 2, asla keskin dönüş yok
//   • boyut currentColor'dan gelir; renk sınıfla verilir
//
// Ölçü `size` ile piksel olarak da verilebilir ama varsayılan 1em: ikon
// yanındaki metinle birlikte büyür.

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface IkonProps extends React.SVGProps<SVGSVGElement> {
  /** Piksel ölçü. Verilmezse 1em — yanındaki metinle ölçeklenir. */
  size?: number | string;
}

function Ikon({ size = "1em", className, children, ...rest }: IkonProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * Yatak — logodaki formun ikon karşılığı: baş ucu dikeyi + yatak platformu.
 *
 * Ayak ucundaki yay önce 5 birimdi ve 11 birimlik düz kısmı yiyip ikonu
 * bota benzetiyordu. Yay 2 birime indi, şilte düz kaldı.
 */
export function LbYatak(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M4 6v13.5" />
      <path d="M4 13h14a2 2 0 0 1 2 2v4.5" />
      <path d="M4 19.5h16" />
      <path d="M7.25 10h4" />
    </Ikon>
  );
}

/** Fiyat etiketi. */
export function LbEtiket(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M11.6 4H6.5A2.5 2.5 0 0 0 4 6.5v5.1c0 .7.3 1.3.7 1.8l6.3 6.3a2.5 2.5 0 0 0 3.6 0l4.8-4.8a2.5 2.5 0 0 0 0-3.6l-6.3-6.3c-.5-.4-1.1-.7-1.8-.7Z" />
      <path d="M8.5 8.5h.01" />
    </Ikon>
  );
}

/** Misafirler — iki kişi. */
export function LbMisafir(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M3.5 19.5v-.8a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v.8" />
      <path d="M16.5 5.6a3 3 0 0 1 0 5.6" />
      <path d="M17 13.9a4.5 4.5 0 0 1 3.5 4.4v1.2" />
    </Ikon>
  );
}

/** Belge — iptal koşulları gibi sözleşme metinleri. */
export function LbBelge(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M13 3.5H7.5A2.5 2.5 0 0 0 5 6v12a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V9.5L13 3.5Z" />
      <path d="M12.75 3.75V8a1.5 1.5 0 0 0 1.5 1.5h4.25" />
      <path d="M8.5 14h7" />
      <path d="M8.5 17.25h4" />
    </Ikon>
  );
}

/** Telefon. */
export function LbTelefon(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M7.4 4h-.9A2.5 2.5 0 0 0 4 6.6c0 7.7 5.7 13.4 13.4 13.4a2.5 2.5 0 0 0 2.6-2.5v-.9a1.5 1.5 0 0 0-1.1-1.4l-2.8-.8a1.5 1.5 0 0 0-1.6.6l-.7 1a11.4 11.4 0 0 1-4.2-4.2l1-.7a1.5 1.5 0 0 0 .6-1.6l-.8-2.8A1.5 1.5 0 0 0 7.4 4Z" />
    </Ikon>
  );
}

/** Bina — otel sayfası. */
export function LbBina(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M5.5 20V6.5A2.5 2.5 0 0 1 8 4h8a2.5 2.5 0 0 1 2.5 2.5V20" />
      <path d="M3.5 20h17" />
      <path d="M9.25 8.5h.01M14.75 8.5h.01M9.25 12.5h.01M14.75 12.5h.01" />
      <path d="M10.5 20v-3a1.5 1.5 0 0 1 3 0v3" />
    </Ikon>
  );
}

/** Konum iğnesi — yol tarifi. */
export function LbKonum(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M19 10.3c0 5-5.4 9.4-6.6 10.3a.7.7 0 0 1-.8 0C10.4 19.7 5 15.3 5 10.3a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </Ikon>
  );
}

/** Ay — gece sayısı. */
export function LbAy(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M20 14.3A8.5 8.5 0 0 1 9.7 4a8.5 8.5 0 1 0 10.3 10.3Z" />
    </Ikon>
  );
}

/** Yıldız — otel sınıfı. Tek dolu ikon; yıldız içi boşken sayılmıyor. */
export function LbYildiz({ size = "1em", className, ...rest }: IkonProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...rest}
    >
      <path d="m12 4.5 2.3 4.7 5.2.8-3.7 3.6.9 5.1-4.7-2.4-4.7 2.4.9-5.1L4.5 10l5.2-.8L12 4.5Z" />
    </svg>
  );
}

/** Onay — daire içinde tik. */
export function LbOnay(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </Ikon>
  );
}

/** Saat — beklemedeki durum. */
export function LbSaat(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8V12l2.8 1.8" />
    </Ikon>
  );
}

/** Çarpı — iptal. */
export function LbCarpi(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.4 9.4 5.2 5.2M14.6 9.4l-5.2 5.2" />
    </Ikon>
  );
}

/** Uyarı — başarısız işlem. */
export function LbUyari(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M10.3 4.9 3.6 16.4A2 2 0 0 0 5.3 19.5h13.4a2 2 0 0 0 1.7-3.1L13.7 4.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 10v3.2M12 16.3h.01" />
    </Ikon>
  );
}

// ── Alt sekme çubuğu ────────────────────────────────────────────────────
//
// Aktif sekmede doluya geçmiyoruz, kalınlaşıyoruz (strokeWidth 2.25 → 3.25).
// Setin grameri çizgi üzerine kurulu; dolu varyant üretmek ya iç detayları
// silmeyi (takvimin tiki kaybolur) ya da iç boşlukları sayfa rengine boyamayı
// gerektirirdi — ikincisi ikonu durduğu zeminin rengine bağımlı yapar ve
// yüzen kapsül yarı saydam olduğu için orada zaten yanlış görünür.
// Kalınlık, çizgi tabanlı bir sette vurgunun doğal ekseni.

/** Arama. */
export function LbAra(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="m15.4 15.4 4.6 4.6" />
    </Ikon>
  );
}

/** Yüzde — kampanyalar. */
export function LbYuzde(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M18 6 6 18" />
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="16" cy="16" r="2.4" />
    </Ikon>
  );
}

/**
 * Takvim — rezervasyonlar.
 *
 * Başlık çizgisi bilerek yok: aktif sekmede çizgi 3.25'e kalınlaşıyor ve
 * kutu + iki askı + başlık çizgisi + tik aynı anda 24px'e sığmıyordu, ikon
 * turuncu bir lekeye dönüşüyordu. İki askı takvimi zaten anlatıyor.
 */
export function LbTakvim(p: IkonProps) {
  return (
    <Ikon {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3.5" />
      <path d="M8 3.25v4.5M16 3.25v4.5" />
      <path d="m9 13.75 2.2 2.2 4-4.2" />
    </Ikon>
  );
}

/** Üç nokta — daha fazla. */
export function LbDahaFazla(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M5.75 12h.01M12 12h.01M18.25 12h.01" />
    </Ikon>
  );
}

// ── Arama akışı ─────────────────────────────────────────────────────────

/** Düz takvim — tarih seçimi. Sekmedeki LbTakvim'den farkı: tik yok. */
export function LbTakvimDuz(p: IkonProps) {
  return (
    <Ikon {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3.5" />
      <path d="M8 3.25v4.5M16 3.25v4.5" />
      <path d="M3.5 10.5h17" />
    </Ikon>
  );
}

/** Kapat. Daire içindeki LbCarpi'den farklı: bu bir eylem, o bir durum. */
export function LbKapat(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="m6.75 6.75 10.5 10.5M17.25 6.75 6.75 17.25" />
    </Ikon>
  );
}

/** Artı — sayaç arttırma. */
export function LbArti(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Ikon>
  );
}

/** Eksi — sayaç azaltma. */
export function LbEksi(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M5.5 12h13" />
    </Ikon>
  );
}

/** Sol ok — geri. */
export function LbSolOk(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M19 12H5.25" />
      <path d="m11 5.5-5.75 6.5L11 18.5" />
    </Ikon>
  );
}

/** Aşağı ok — açılır liste, akordiyon. */
export function LbAsagiOk(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="m5.5 9.25 6.5 6 6.5-6" />
    </Ikon>
  );
}

/** Küre — uyruk, dil. */
export function LbKure(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5a13.5 13.5 0 0 1 0 17 13.5 13.5 0 0 1 0-17Z" />
    </Ikon>
  );
}

/** Liste görünümü. */
export function LbListe(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M9.5 6.5h10.5M9.5 12h10.5M9.5 17.5h10.5" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Ikon>
  );
}

/** Harita görünümü — katlanmış harita. */
export function LbHarita(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="m3.5 7 5.75-2.5 5.5 2.5L20.5 4.5v12.5L14.75 19.5l-5.5-2.5L3.5 19.5V7Z" />
      <path d="M9.25 4.5V17M14.75 7v12.5" />
    </Ikon>
  );
}

/** Filtreler — sürgüler. */
export function LbFiltre(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M4 7.5h14.5M4 16.5h9.5" />
      <circle cx="17" cy="16.5" r="2.75" />
      <circle cx="8.5" cy="7.5" r="2.75" />
    </Ikon>
  );
}

/** Kalem — düzenle. */
export function LbKalem(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="m4.5 19.5 1-4 9.3-9.3 3 3-9.3 9.3-4 1Z" />
      <path d="m14.8 6.2 1.9-1.9a1.6 1.6 0 0 1 2.2 0l.8.8a1.6 1.6 0 0 1 0 2.2l-1.9 1.9" />
    </Ikon>
  );
}

/** Sonuç yok — büyüteç içinde çarpı. */
export function LbAramaBos(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="m15.4 15.4 4.6 4.6" />
      <path d="m8.4 8.4 4.2 4.2M12.6 8.4l-4.2 4.2" />
    </Ikon>
  );
}

/** Bilgi — açıklama bölümü. */
export function LbBilgi(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.25" />
      <path d="M12 7.75h.01" />
    </Ikon>
  );
}

/** Resepsiyon zili — otel olanakları. */
export function LbZil(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M4 16.5h16" />
      <path d="M5.75 16.5a6.25 6.25 0 0 1 12.5 0" />
      <path d="M12 6.5v3.75" />
      <path d="M12 4.5h.01" />
      <path d="M3.5 19.75h17" />
    </Ikon>
  );
}

/** Soru işareti — yardım. */
export function LbYardim(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.5" />
      <path d="M12 16.6h.01" />
    </Ikon>
  );
}

/** Kalkan — gizlilik. */
export function LbKalkan(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M12 3.5 5 6v6c0 4.2 3 7.2 7 8.5 4-1.3 7-4.3 7-8.5V6l-7-2.5Z" />
    </Ikon>
  );
}

/** Terazi — yasal metinler. */
export function LbTerazi(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M12 4.5v15M7 19.5h10" />
      <path d="M5 8.5h14" />
      <path d="M5 8.5 2.75 14h4.5L5 8.5ZM19 8.5 16.75 14h4.5L19 8.5Z" />
    </Ikon>
  );
}

/** Çıkış — oturumu kapat. */
export function LbCikis(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M14.5 4.5h2A2.5 2.5 0 0 1 19 7v10a2.5 2.5 0 0 1-2.5 2.5h-2" />
      <path d="M10 8.25 13.75 12 10 15.75" />
      <path d="M13.5 12H4.75" />
    </Ikon>
  );
}

/** Kullanıcı — hesap kapısı. */
export function LbKullanici(p: IkonProps) {
  return (
    <Ikon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="10" r="2.75" />
      <path d="M6.4 18.6a6.2 6.2 0 0 1 11.2 0" />
    </Ikon>
  );
}

/** Menü — web navbar'ındaki hamburger. */
export function LbMenu(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Ikon>
  );
}

/** Sağ ok — satır bağlantıları. */
export function LbSagOk(p: IkonProps) {
  return (
    <Ikon {...p}>
      <path d="m9.5 5.5 6 6.5-6 6.5" />
    </Ikon>
  );
}
