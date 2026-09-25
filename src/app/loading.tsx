// Sunucuda hazırlanan sayfalar (vitrin, paneller) yüklenirken: zil.
import { Bekleme } from "@/components/lb/bekleme";

export default function Yukleniyor() {
  return (
    <div className="lb" style={{ minHeight: "70dvh", display: "grid", placeItems: "center", background: "#fff" }}>
      <Bekleme tur="zil" boyut={120} />
    </div>
  );
}
