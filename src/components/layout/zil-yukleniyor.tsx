// Sunucuda hazırlanan sayfalar (vitrin, paneller) yüklenirken: zil.
//
// Kökte değil, yalnız bu sayfaların loading.tsx'inde: kökteki bir yükleme
// sınırı her sayfayı akışla göndermeye başlatıyordu; o zaman sayfa içindeki
// notFound() ve yönlendirmeler gerçek 404/308 yerine 200 dönüyordu (otel
// adresleri kökte: lookbeds.com/<otel>, bilinmeyen adres 404 olmalı).
import { Bekleme } from "@/components/lb/bekleme";

export function ZilYukleniyor() {
  return (
    <div className="lb" style={{ minHeight: "70dvh", display: "grid", placeItems: "center", background: "#fff" }}>
      <Bekleme tur="zil" boyut={120} />
    </div>
  );
}
