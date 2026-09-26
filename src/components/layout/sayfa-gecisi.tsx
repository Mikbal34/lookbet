"use client";

// Sayfa geçişi — tek hareket imzası.
//
// Her rota değişiminde içerik aynı şekilde beliriyor. Uygulamada tek bir
// hareket dili olması, her ekranın kendi efektini yapmasından iyi: çok çeşit
// hareket dağıtır, tek imza akıcı gösterir.
//
// SADECE OPAKLIK, transform yok — ve bu bilinçli bir sınır:
// sayfaların içinde 10 kadar `position: fixed` öğe var (arama katmanı, oda
// detay penceresi, galeri, iptal onayı, sayfa altı yaprakları). Sarmalayıcıya
// transform verilirse CSS'e göre o öğeler viewport'a değil sarmalayıcıya göre
// konumlanır ve animasyon süresince kayarlar. Opaklık böyle bir kapsayıcı
// blok yaratmıyor.
//
// Gerçek native geçiş (push/pop) için React'in ViewTransition API'si gerekir;
// Next'te experimental.viewTransition seçeneği var ama React'in stabil
// sürümünde unstable_ViewTransition tanımlı değil (experimental kanalda).
// Üretim uygulamasını o kanala almak bu iş için doğru takas değil.
//
// prefers-reduced-motion globals.css'te global olarak ele alınıyor.

import * as React from "react";
import { usePathname } from "next/navigation";

export function SayfaGecisi({ children }: { children: React.ReactNode }) {
  const yol = usePathname();
  // key: rota değişince alt ağaç yeniden monte olsun ve animasyon baştan
  // çalışsın. Next zaten rota değişiminde sayfayı değiştiriyor; buradaki key
  // animasyonu tetiklemek için.
  return (
    <div key={yol} className="sayfa-gecisi">
      {children}
    </div>
  );
}
